import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import db from '../../db.js';
import { users, tenantMembers, tenants } from '../../schema.js';

const app = new Hono();

/**
 * GET /api/v1/admin/users
 * 登録ユーザー一覧 (新しい順に最大 200 件)
 *
 * Phase 2a では 1ユーザー=1テナントのため tenant_members は 0 or 1 件。
 * 未所属ユーザー (オンボーディング未完了) も閲覧できるよう LEFT JOIN。
 */
app.get('/', async (c) => {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantPlan: tenants.plan,
      tenantRole: tenantMembers.role,
    })
    .from(users)
    .leftJoin(tenantMembers, eq(tenantMembers.userId, users.id))
    .leftJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .orderBy(desc(users.createdAt))
    .limit(200);
  return c.json(rows);
});

/**
 * GET /api/v1/admin/users/:id
 * ユーザー詳細
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantPlan: tenants.plan,
      tenantRole: tenantMembers.role,
      tenantCreatedAt: tenants.createdAt,
    })
    .from(users)
    .leftJoin(tenantMembers, eq(tenantMembers.userId, users.id))
    .leftJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
    .where(eq(users.id, id))
    .limit(1);
  if (!row) return c.text('Not Found', 404);
  return c.json(row);
});

export default app;
