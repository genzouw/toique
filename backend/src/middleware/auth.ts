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
 * - ログイン済みであること
 * - セッションユーザーのメールが OPERATOR_EMAILS allowlist に含まれること
 * 該当しない場合は 404 を返す (存在を漏らさないため)
 */
export const requireOperator: MiddlewareHandler = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user || !isOperatorEmail(session.user.email)) {
    return c.text('Not Found', 404);
  }
  c.set('authUser', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
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
