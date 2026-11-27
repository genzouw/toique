import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenants, tenantMembers } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';
import { jsonBody } from '../lib/validation.js';

const app = new Hono();

app.use('*', requireAuth);

// 現在のユーザーの所属テナントを返す。未所属なら null。
app.get('/me', async (c) => {
  const user = c.get('authUser');
  const [member] = await db
    .select({
      tenantId: tenantMembers.tenantId,
      role: tenantMembers.role,
      tenantName: tenants.name,
      tenantPlan: tenants.plan,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(eq(tenantMembers.userId, user.id))
    .limit(1);

  return c.json({
    user,
    tenant: member
      ? {
          id: member.tenantId,
          name: member.tenantName,
          plan: member.tenantPlan,
          role: member.role,
        }
      : null,
  });
});

const MAX_TENANT_NAME_LENGTH = 100;

const onboardingBody = z.object({
  tenantName: z.string().trim().min(1).max(MAX_TENANT_NAME_LENGTH),
});

// テナントを作成し、呼び出し元ユーザーを admin として登録
app.post('/', jsonBody(onboardingBody), async (c) => {
  const user = c.get('authUser');
  const body = c.req.valid('json');

  // 既に tenant_member がある場合は 409
  const existing = await db
    .select({ id: tenantMembers.id })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, user.id))
    .limit(1);
  if (existing.length > 0) {
    return c.text('Tenant already provisioned', 409);
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name: body.tenantName })
    .returning({ id: tenants.id, name: tenants.name, plan: tenants.plan });
  if (!tenant) throw new Error('Tenant insert returned no row');

  await db.insert(tenantMembers).values({
    tenantId: tenant.id,
    userId: user.id,
    role: 'admin',
  });

  return c.json(
    {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        role: 'admin',
      },
    },
    201,
  );
});

export default app;
