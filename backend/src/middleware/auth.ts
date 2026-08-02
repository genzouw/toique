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
const MAX_BUCKETS = 10000;
const rateBuckets = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const history = rateBuckets.get(ip);
  if (!history) return false;

  let expiredCount = 0;
  while (
    expiredCount < history.length &&
    history[expiredCount] <= windowStart
  ) {
    expiredCount++;
  }
  if (expiredCount > 0) history.splice(0, expiredCount);

  return history.length >= RATE_LIMIT_MAX;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const history = rateBuckets.get(ip);
  if (!history) {
    if (rateBuckets.size >= MAX_BUCKETS) {
      const oldestKey = rateBuckets.keys().next().value;
      if (oldestKey !== undefined) rateBuckets.delete(oldestKey);
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
