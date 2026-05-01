import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import db from '../db.js';
import { forms, lineChannels } from '../schema.js';
import { checkQuota } from '../lib/quota.js';
import { FormSchemaDef } from '../lib/forms/types.js';

const app = new Hono();

function validateSchema(schema: unknown): string | null {
  const result = FormSchemaDef.safeParse(schema);
  if (!result.success) {
    return result.error.issues
      .map((i) => i.path.join('.') + ': ' + i.message)
      .join('; ');
  }
  return null;
}

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const rows = await db
    .select({
      id: forms.id,
      tenantId: forms.tenantId,
      lineChannelId: forms.lineChannelId,
      name: forms.name,
      status: forms.status,
      triggerKeyword: forms.triggerKeyword,
      version: forms.version,
      createdAt: forms.createdAt,
      updatedAt: forms.updatedAt,
    })
    .from(forms)
    .where(eq(forms.tenantId, tenant.id));
  return c.json(rows);
});

app.get('/:id', async (c) => {
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  const [row] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.tenantId, tenant.id)))
    .limit(1);
  if (!row) return c.text('Not Found', 404);
  return c.json(row);
});

app.post('/', async (c) => {
  const tenant = c.get('tenant');
  const body = (await c.req.json()) as {
    name?: string;
    lineChannelId?: string;
    status?: string;
    triggerKeyword?: string | null;
    schema?: unknown;
  };

  if (!body.name || !body.lineChannelId || !body.schema) {
    return c.text('name, lineChannelId, schema are required', 400);
  }

  // line_channel がテナント配下かを確認
  const [channel] = await db
    .select()
    .from(lineChannels)
    .where(
      and(
        eq(lineChannels.id, body.lineChannelId),
        eq(lineChannels.tenantId, tenant.id),
      ),
    )
    .limit(1);
  if (!channel) return c.text('lineChannelId not in this tenant', 400);

  const quota = await checkQuota(tenant.id, tenant.plan, 'forms', {
    unlimited: tenant.unlimited,
  });
  if (!quota.allowed) {
    return c.json({ error: 'フォームの作成上限に達しています', ...quota }, 403);
  }

  const schemaError = validateSchema(body.schema);
  if (schemaError) return c.text(schemaError, 400);

  const [created] = await db
    .insert(forms)
    .values({
      tenantId: tenant.id,
      lineChannelId: body.lineChannelId,
      name: body.name,
      status: body.status ?? 'draft',
      triggerKeyword: body.triggerKeyword ?? null,
      schema: body.schema as Record<string, unknown>,
    })
    .returning();

  return c.json(created, 201);
});

app.patch('/:id', async (c) => {
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  const body = (await c.req.json()) as Partial<{
    name: string;
    status: string;
    triggerKeyword: string | null;
    schema: unknown;
  }>;

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.name !== undefined) update.name = body.name;
  if (body.status !== undefined) update.status = body.status;
  if (body.triggerKeyword !== undefined)
    update.triggerKeyword = body.triggerKeyword;
  if (body.schema !== undefined) {
    const err = validateSchema(body.schema);
    if (err) return c.text(err, 400);
    update.schema = body.schema;
  }

  const [updated] = await db
    .update(forms)
    .set(update)
    .where(and(eq(forms.id, id), eq(forms.tenantId, tenant.id)))
    .returning();

  if (!updated) return c.text('Not Found', 404);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  await db
    .delete(forms)
    .where(and(eq(forms.id, id), eq(forms.tenantId, tenant.id)));
  return c.body(null, 204);
});

export default app;
