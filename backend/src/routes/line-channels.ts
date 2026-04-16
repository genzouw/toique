import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { lineChannels } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const rows = await db.select().from(lineChannels);
  // Phase 1: 平文で返す（Phase 2 で secret/token をマスク化）
  return c.json(rows);
});

app.post('/', async (c) => {
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

  const [created] = await db
    .insert(lineChannels)
    .values({
      channelId: body.channelId,
      channelSecret: body.channelSecret,
      channelAccessToken: body.channelAccessToken,
      displayName: body.displayName,
    })
    .returning();

  return c.json(created, 201);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(lineChannels).where(eq(lineChannels.id, id));
  return c.body(null, 204);
});

export default app;
