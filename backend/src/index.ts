import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { sql } from './db.js';

const app = new Hono();

app.get('/health', async (c) => {
  const [{ now }] = await sql`SELECT now()`;
  return c.json({ status: 'ok', time: now });
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
