import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import db from '../../db.js';
import { contacts, tenants } from '../../schema.js';

const app = new Hono();

const STATUS_VALUES = new Set(['new', 'in_review', 'done']);

/**
 * GET /api/v1/admin/contacts
 * 問い合わせ一覧 (新しい順に最大 200 件)
 */
app.get('/', async (c) => {
  const rows = await db
    .select({
      id: contacts.id,
      userId: contacts.userId,
      tenantId: contacts.tenantId,
      tenantName: tenants.name,
      name: contacts.name,
      email: contacts.email,
      category: contacts.category,
      subject: contacts.subject,
      status: contacts.status,
      createdAt: contacts.createdAt,
    })
    .from(contacts)
    .leftJoin(tenants, eq(tenants.id, contacts.tenantId))
    .orderBy(desc(contacts.createdAt))
    .limit(200);
  return c.json(rows);
});

/**
 * GET /api/v1/admin/contacts/:id
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const [row] = await db
    .select({
      id: contacts.id,
      userId: contacts.userId,
      tenantId: contacts.tenantId,
      tenantName: tenants.name,
      name: contacts.name,
      email: contacts.email,
      category: contacts.category,
      subject: contacts.subject,
      body: contacts.body,
      url: contacts.url,
      status: contacts.status,
      userAgent: contacts.userAgent,
      ipAddress: contacts.ipAddress,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    })
    .from(contacts)
    .leftJoin(tenants, eq(tenants.id, contacts.tenantId))
    .where(eq(contacts.id, id))
    .limit(1);
  if (!row) return c.text('Not Found', 404);
  return c.json(row);
});

/**
 * PATCH /api/v1/admin/contacts/:id
 * ステータス変更 (new / in_review / done)
 */
app.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = (await c.req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return c.text('Invalid JSON', 400);

  const status = typeof body.status === 'string' ? body.status : '';
  if (!STATUS_VALUES.has(status)) return c.text('status is invalid', 400);

  const [updated] = await db
    .update(contacts)
    .set({ status, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();
  if (!updated) return c.text('Not Found', 404);
  return c.json(updated);
});

export default app;
