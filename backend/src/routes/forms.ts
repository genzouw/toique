import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import db from '../db.js';
import { forms, lineChannels } from '../schema.js';
import { checkQuota } from '../lib/quota.js';
import { FormSchemaDef } from '../lib/forms/types.js';
import { jsonBody } from '../lib/validation.js';

// 名前・キーワードの長さの上限は、本番の既存データの最大長を確かめてから別途決める（Issue #1124）
// name は検証だけにして、保存値は変換しない（従来どおり前後の空白を保つ）
const FORM_STATUSES = ['draft', 'published', 'archived'] as const;

const formCreateBody = z.object({
  name: z.string().refine((s) => s.trim().length > 0),
  lineChannelId: z.uuid(),
  status: z.enum(FORM_STATUSES).optional(),
  triggerKeyword: z.string().nullable().optional(),
  // 中身は従来どおり validateSchema で検証する
  schema: z.unknown().refine((v) => !!v, { message: 'schema is required' }),
});

const formPatchBody = z.object({
  name: z
    .string()
    .refine((s) => s.trim().length > 0)
    .optional(),
  status: z.enum(FORM_STATUSES).optional(),
  triggerKeyword: z.string().nullable().optional(),
  schema: z.unknown().optional(),
});

// GET /:id・POST・PATCH が返す列。テーブルに足した列は、ここに書くまでレスポンスに含まれない。
const formColumns = {
  id: forms.id,
  tenantId: forms.tenantId,
  lineChannelId: forms.lineChannelId,
  name: forms.name,
  status: forms.status,
  triggerKeyword: forms.triggerKeyword,
  schema: forms.schema,
  version: forms.version,
  createdAt: forms.createdAt,
  updatedAt: forms.updatedAt,
};

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
  // ⚡ Bolt: Select only scalar fields for list endpoints to avoid loading the large JSON 'schema' column, reducing db I/O and payload size.
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
    .where(eq(forms.tenantId, tenant.id))
    .orderBy(desc(forms.createdAt));
  return c.json(rows);
});

app.get('/:id', async (c) => {
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  const [row] = await db
    .select(formColumns)
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.tenantId, tenant.id)))
    .limit(1);
  if (!row) return c.text('Not Found', 404);
  return c.json(row);
});

app.post('/', jsonBody(formCreateBody), async (c) => {
  const tenant = c.get('tenant');
  const body = c.req.valid('json');

  // line_channel がテナント配下かを確認
  const [channel] = await db
    .select({ id: lineChannels.id })
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
    .returning(formColumns);
  if (!created) throw new Error('Form insert returned no row');

  return c.json(created, 201);
});

app.patch('/:id', jsonBody(formPatchBody), async (c) => {
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  const body = c.req.valid('json');

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
    .returning(formColumns);

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
