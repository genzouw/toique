import { createHash, timingSafeEqual } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenantMembers, tenants } from '../schema.js';
import { auth } from '../auth/better-auth.js';

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
};

declare module 'hono' {
  interface ContextVariableMap {
    authUser: AuthUser;
    tenant: TenantContext;
  }
}

const OPERATOR_ALLOWLIST = (process.env.OPERATOR_EMAILS ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)
) {
  throw new Error(
    'ADMIN_USERNAME and ADMIN_PASSWORD must be set in production',
  );
}

const expectedUsernameHash = createHash('sha256')
  .update(process.env.ADMIN_USERNAME || 'admin')
  .digest();
const expectedPasswordHash = createHash('sha256')
  .update(process.env.ADMIN_PASSWORD || 'admin')
  .digest();

export function isOperatorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OPERATOR_ALLOWLIST.includes(email.trim().toLowerCase());
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

/**
 * 運営者 (Toique を運営する側) のみ通過させるミドルウェア。
 * Basic認証で固定ID/パスワードを確認する。
 * 該当しない場合は 401 を返す。
 */
export const requireOperator: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const base64Credentials = authHeader.split(' ')[1];
  let decoded: string;
  try {
    decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const username = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  const usernameHash = createHash('sha256').update(username).digest();
  const passwordHash = createHash('sha256').update(password).digest();

  const usernameMatch = timingSafeEqual(usernameHash, expectedUsernameHash);
  const passwordMatch = timingSafeEqual(passwordHash, expectedPasswordHash);
  if (!usernameMatch || !passwordMatch) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

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

  c.set('authUser', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  c.set('tenant', {
    id: member.tenantId,
    name: member.tenantName,
    plan: member.tenantPlan,
    role: member.role,
  });
  await next();
};
