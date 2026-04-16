import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenants, tenantMembers } from '../schema.js';
import { requireAuth } from '../middleware/auth.js';

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

// テナントを作成し、呼び出し元ユーザーを admin として登録
app.post('/', async (c) => {
  const user = c.get('authUser');
  const body = (await c.req.json()) as { tenantName?: string };
  if (!body.tenantName || body.tenantName.trim().length === 0) {
    return c.text('tenantName is required', 400);
  }

  // 既に tenant_member がある場合は 409
  const existing = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, user.id))
    .limit(1);
  if (existing.length > 0) {
    return c.text('Tenant already provisioned', 409);
  }

  const [tenant] = await db
    .insert(tenants)
    .values({ name: body.tenantName.trim() })
    .returning();

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
