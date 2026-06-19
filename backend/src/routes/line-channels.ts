import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import db from '../db.js';
import { lineChannels } from '../schema.js';
import { checkQuota } from '../lib/quota.js';

const app = new Hono();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const rows = await db
    .select({
      id: lineChannels.id,
      tenantId: lineChannels.tenantId,
      channelId: lineChannels.channelId,
      displayName: lineChannels.displayName,
      isActive: lineChannels.isActive,
      createdAt: lineChannels.createdAt,
    })
    .from(lineChannels)
    .where(eq(lineChannels.tenantId, tenant.id));
  return c.json(rows);
});

app.post('/', async (c) => {
  const tenant = c.get('tenant');
  const body = (await c.req.json()) as {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
    displayName: string;
  };
  if (
    !body.channelId ||
    !body.channelSecret ||
    !body.channelAccessToken ||
    !body.displayName
  ) {
    return c.text('Missing required fields', 400);
  }

  const quota = await checkQuota(tenant.id, tenant.plan, 'lineChannels', {
    unlimited: tenant.unlimited,
  });
  if (!quota.allowed) {
    return c.json(
      { error: 'LINEチャネルの登録上限に達しています', ...quota },
      403,
    );
  }

  const [created] = await db
    .insert(lineChannels)
    .values({
      tenantId: tenant.id,
      channelId: body.channelId,
      channelSecret: body.channelSecret,
      channelAccessToken: body.channelAccessToken,
      displayName: body.displayName,
    })
    .returning({
      id: lineChannels.id,
      tenantId: lineChannels.tenantId,
      channelId: lineChannels.channelId,
      displayName: lineChannels.displayName,
      isActive: lineChannels.isActive,
      createdAt: lineChannels.createdAt,
    });

  return c.json(created, 201);
});

app.delete('/:id', async (c) => {
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  await db
    .delete(lineChannels)
    .where(and(eq(lineChannels.id, id), eq(lineChannels.tenantId, tenant.id)));
  return c.body(null, 204);
});

export default app;
