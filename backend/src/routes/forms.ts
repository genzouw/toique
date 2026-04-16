import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import db from '../db.js';
import { forms, lineChannels } from '../schema.js';

const app = new Hono();

type FormSchema = {
  startStep?: string;
  steps?: Record<string, unknown>;
};

function validateSchema(schema: unknown): string | null {
  if (!schema || typeof schema !== 'object') return 'schema must be an object';
  const s = schema as FormSchema;
  if (!s.startStep || typeof s.startStep !== 'string') {
    return 'schema.startStep is required';
  }
  if (!s.steps || typeof s.steps !== 'object') {
    return 'schema.steps is required';
  }
  if (!(s.startStep in s.steps)) {
    return `schema.steps must contain the startStep "${s.startStep}"`;
  }
  return null;
}

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const rows = await db
    .select()
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
