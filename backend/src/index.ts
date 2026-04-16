import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { sql } from './db.js';
import lineWebhook from './routes/webhooks/line.js';
import lineChannels from './routes/line-channels.js';
import messages from './routes/messages.js';

const app = new Hono({ strict: false });

app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);

app.get('/health', async (c) => {
  const [{ now }] = await sql`SELECT now()`;
  return c.json({ status: 'ok', time: now });
});

// 公開エンドポイント (LINEプラットフォームから呼ばれる)
app.route('/webhooks/line', lineWebhook);

// 管理API (Phase 1: 認証なし)
app.route('/api/v1/line-channels', lineChannels);
app.route('/api/v1/messages', messages);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Toique backend listening on :${port}`);
});

export default app;
