import { createHash, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenantMembers, tenants } from '../schema.js';
import { auth } from '../auth/better-auth.js';
import { isDogfoodingEmail } from '../lib/dogfooding.js';
import { createEnvSetReader } from '../lib/env-set.js';
import { clientIp } from '../lib/client-ip.js';

type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type TenantContext = {
  id: string;
  name: string;
  plan: string;
  role: string;
  /**
   * true の場合、Stripe 課金なしで Pro 相当・全クォータ無制限として扱う。
   * 運営ドッグフーディングアカウント (lib/dogfooding.ts) のみ true になる。
   */
  unlimited: boolean;
};

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser;
    tenant: TenantContext;
  }
}

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)
) {
  throw new Error(
    'ADMIN_USERNAME and ADMIN_PASSWORD must be set in production',
  );
}

const getExpectedHash = (val: string | undefined) =>
  val ? createHash('sha256').update(val).digest() : null;

const expectedUsernameHash = getExpectedHash(process.env.ADMIN_USERNAME);
const expectedPasswordHash = getExpectedHash(process.env.ADMIN_PASSWORD);

const getOperatorEmailSet = createEnvSetReader('OPERATOR_EMAILS');

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getOperatorEmailSet().has(email.trim().toLowerCase());
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.text('Unauthorized', 401);

  c.set('authUser', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  await next();
};

// 簡易レート制限 (プロセスメモリ内)
// 単一 Bun プロセスでの運用を前提とする。複数ワーカー/プロセス/コンテナに
// スケールする構成に変更する場合は、共有TTLストア (Redis 等) と
// アトミックな更新に置き換えること（同一IPの失敗回数を実行単位間で共有するため）。
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15分
const RATE_LIMIT_MAX = 5;
// テストで上限到達時の evict 挙動を検証できるように環境変数での上書きを許可する
const MAX_BUCKETS = Number(process.env.RATE_LIMIT_MAX_BUCKETS ?? 10000);
const rateBuckets = new Map<string, number[]>();

// 期限切れタイムスタンプの件数を数える（history は時系列順に並んでいる）
function countExpired(history: number[], windowStart: number): number {
  let count = 0;
  while (count < history.length && history[count] <= windowStart) {
    count++;
  }
  return count;
}

// 期限切れエントリを取り除き、Map の挿入順を最新に更新（touch）する。
// isRateLimited（429判定の都度）でもこの touch を行わないと、既にレート
// 制限に達したIPはチェックされるだけで挿入順が更新されず、他の新規IPの
// 登録によって「挿入順で最古のキー」として誤って evict されてしまう。
// その結果、攻撃者が多数の別IPでバケットを埋めるだけで対象IPの失敗履歴が
// リセットされ、レート制限を回避できてしまう。この touch はその回避を防ぐ。
function pruneAndTouch(ip: string, now: number): number[] | undefined {
  const history = rateBuckets.get(ip);
  if (!history) return undefined;

  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const expiredCount = countExpired(history, windowStart);
  if (expiredCount > 0) history.splice(0, expiredCount);

  if (history.length === 0) {
    rateBuckets.delete(ip);
    return undefined;
  }

  rateBuckets.delete(ip);
  rateBuckets.set(ip, history);
  return history;
}

function isRateLimited(ip: string): boolean {
  const history = pruneAndTouch(ip, Date.now());
  return history !== undefined && history.length >= RATE_LIMIT_MAX;
}

// MAX_BUCKETS 到達時、新規バケット登録のために1件 evict する。
// 挿入順の先頭から走査し、実際に期限切れ（ウィンドウ外）と確認できた
// バケットを優先して削除する。有効な履歴を持つIPを、たまたま挿入順が
// 古いというだけで削除しないようにするため（pruneAndTouch によって
// アクティブなIPは都度挿入順が更新されるので、通常はここで期限切れの
// バケットが見つかる）。期限切れが1件も見つからない場合のみ、メモリ
// 上限を守るため挿入順で最も古いキーを削除する。
// 1回の evict で走査するバケット数の上限（飽和時の O(MAX_BUCKETS) 走査を防ぐ）
const EVICT_SCAN_LIMIT = 64;

function evictOldestBucket(now: number) {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  let scanned = 0;
  for (const [key, history] of rateBuckets) {
    const lastTimestamp = history[history.length - 1];
    if (lastTimestamp === undefined || lastTimestamp <= windowStart) {
      rateBuckets.delete(key);
      return;
    }
    if (++scanned >= EVICT_SCAN_LIMIT) break;
  }
  const oldestKey = rateBuckets.keys().next().value;
  if (oldestKey !== undefined) rateBuckets.delete(oldestKey);
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const history = rateBuckets.get(ip);
  if (!history) {
    if (rateBuckets.size >= MAX_BUCKETS) {
      evictOldestBucket(now);
    }
    rateBuckets.set(ip, [now]);
  } else {
    history.push(now);
    rateBuckets.delete(ip);
    rateBuckets.set(ip, history);
  }
}

/**
 * 運営者 (Toique を運営する側) のみ通過させるミドルウェア。
 * Basic認証で固定ID/パスワードを確認する。
 * 該当しない場合は 401 を返す。
 */
export const requireOperator: MiddlewareHandler = async (c, next) => {
  const ip = clientIp(c.req.raw.headers);

  // 本番環境では Cloud Run のプロキシが x-forwarded-for を必ず付与するため、
  // "unknown" になるのはプロキシ設定不備を意味する。放置すると、IPを特定
  // できない複数クライアントが同一バケットを共有してしまい、無関係な
  // クライアント同士が互いの失敗回数でロックアウトされ得るため、設定不備
  // として拒否する（本番以外はローカル検証の利便性のため許容する）。
  if (process.env.NODE_ENV === 'production' && ip === 'unknown') {
    return c.text('Unauthorized', 401);
  }

  if (isRateLimited(ip)) {
    return c.text('Too Many Requests', 429);
  }

  if (!expectedUsernameHash || !expectedPasswordHash) {
    recordFailedAttempt(ip);
    return c.text('Unauthorized', 401);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    recordFailedAttempt(ip);
    return c.text('Unauthorized', 401);
  }

  const base64Credentials = authHeader.split(' ')[1];
  let decoded: string;
  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  } catch {
    recordFailedAttempt(ip);
    return c.text('Unauthorized', 401);
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    recordFailedAttempt(ip);
    return c.text('Unauthorized', 401);
  }
  const username = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const usernameHash = createHash('sha256').update(username).digest();
  const passwordHash = createHash('sha256').update(password).digest();

  const usernameMatch = timingSafeEqual(usernameHash, expectedUsernameHash);
  const passwordMatch = timingSafeEqual(passwordHash, expectedPasswordHash);
  if (!usernameMatch || !passwordMatch) {
    recordFailedAttempt(ip);
    return c.text('Unauthorized', 401);
  }

  // ログイン成功時に失敗履歴をクリア
  rateBuckets.delete(ip);

  await next();
};

export const requireTenant: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return c.text('Unauthorized', 401);

  const [member] = await db
    .select({
      tenantId: tenantMembers.tenantId,
      role: tenantMembers.role,
      tenantName: tenants.name,
      tenantPlan: tenants.plan,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(eq(tenantMembers.userId, session.user.id))
    .limit(1);

  if (!member) return c.text('Tenant not provisioned', 403);

  const unlimited = isDogfoodingEmail(session.user.email);

  c.set('authUser', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  c.set('tenant', {
    id: member.tenantId,
    name: member.tenantName,
    plan: unlimited ? 'pro' : member.tenantPlan,
    role: member.role,
    unlimited,
  });
  await next();
};
