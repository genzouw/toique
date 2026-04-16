import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import db from '../db.js';
import { inboundMessages } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const rows = await db
    .select()
    .from(inboundMessages)
    .orderBy(desc(inboundMessages.receivedAt))
    .limit(100);
  return c.json(rows);
});

export default app;
