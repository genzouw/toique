import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { contacts, tenantMembers, tenants } from '../schema.js';
import { auth } from '../auth/better-auth.js';
import { notifyContact } from '../lib/notify-contact.js';

const app = new Hono();

const CATEGORIES = new Set([
  'bug',
  'feature',
  'pricing',
  'consultation',
  'other',
]);

// ------------------------------------
// 簡易レート制限 (プロセスメモリ内)
// ------------------------------------
// 同一IPから 1 時間に 5 件までに制限。
// 分散環境を考慮するなら Redis 等に置き換える。
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateBuckets = new Map<string, number[]>();

// ソート済み配列の先頭から期限切れエントリ数をカウント
function countExpired(timestamps: number[], windowStart: number): number {
  let count = 0;
  while (count < timestamps.length && timestamps[count] <= windowStart) {
    count++;
  }
  return count;
}

// 古いエントリを定期的にクリーンアップしてメモリリークを防止
// ⚡ Bolt: Use while loop and splice for in-place array cleanup to avoid allocating a new array every time.
setInterval(() => {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of rateBuckets) {
    const expiredCount = countExpired(timestamps, windowStart);

    if (expiredCount === timestamps.length) {
      rateBuckets.delete(ip);
    } else if (expiredCount > 0) {
      timestamps.splice(0, expiredCount);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

// ⚡ Bolt: Replace `.filter()` with in-place mutation to minimize garbage collection pauses.
// Only calls `Map.set()` when initializing a new array.
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const history = rateBuckets.get(ip);

  if (!history) {
    if (RATE_LIMIT_MAX <= 0) return true;
    rateBuckets.set(ip, [now]);
    return false;
  }

  const expiredCount = countExpired(history, windowStart);

  if (expiredCount > 0) {
    history.splice(0, expiredCount);
  }

  if (history.length >= RATE_LIMIT_MAX) {
    return true;
  }

  history.push(now);
  return false;
}

// Cloud Run の内部プロキシが実クライアントIPを右端に追記するため、
// 右端の値を採用する（左端はクライアントが偽装可能）
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',').at(-1)?.trim();
    if (ip) return ip;
  }
  return headers.get('x-real-ip') ?? 'unknown';
}

/**
 * 公開問い合わせ送信
 * POST /api/v1/contact
 */
app.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return c.text('Invalid JSON', 400);

  // ハニーポット: 人間が触らない hidden フィールドが埋まっていたら成功レスポンスを返しつつ破棄
  if (typeof body.website === 'string' && body.website.length > 0) {
    return c.json({ ok: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const category =
    typeof body.category === 'string' ? body.category.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const content = typeof body.body === 'string' ? body.body.trim() : '';
  const url = typeof body.url === 'string' ? body.url.trim() : '';

  if (!name || name.length > 100) return c.text('name is invalid', 400);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200)
    return c.text('email is invalid', 400);
  if (!CATEGORIES.has(category)) return c.text('category is invalid', 400);
  if (!subject || subject.length > 200)
    return c.text('subject is invalid', 400);
  if (!content || content.length > 5000) return c.text('body is invalid', 400);
  if (url && url.length > 500) return c.text('url is invalid', 400);

  const ip = clientIp(c.req.raw.headers);
  if (rateLimited(ip)) {
    return c.text('Too Many Requests', 429);
  }

  // ログイン状態なら紐付け (任意)
  let userId: string | null = null;
  let tenantId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (session?.user) {
      userId = session.user.id;
      const [member] = await db
        .select({ tenantId: tenantMembers.tenantId })
        .from(tenantMembers)
        .where(eq(tenantMembers.userId, session.user.id))
        .limit(1);
      if (member) tenantId = member.tenantId;
    }
  } catch {
    // セッション取得失敗は無視して未ログイン扱い
  }

  const userAgent = c.req.header('user-agent') ?? null;

  const [inserted] = await db
    .insert(contacts)
    .values({
      userId,
      tenantId,
      name,
      email,
      category,
      subject,
      body: content,
      url: url || null,
      userAgent,
      ipAddress: ip === 'unknown' ? null : ip,
    })
    .returning();

  // テナント名解決 (通知メール用)
  let tenantName: string | null = null;
  if (tenantId) {
    const [t] = await db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    tenantName = t?.name ?? null;
  }

  // 通知は best-effort (失敗してもレスポンスには影響させない)
  void notifyContact({
    id: inserted.id,
    name,
    email,
    category,
    subject,
    body: content,
    url: url || null,
    tenantName,
  });

  return c.json({ ok: true, id: inserted.id });
});

export default app;
