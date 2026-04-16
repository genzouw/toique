import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { sql } from './db.js';
import { auth } from './auth/better-auth.js';
import lineWebhook from './routes/webhooks/line.js';
import lineChannels from './routes/line-channels.js';
import messages from './routes/messages.js';
import onboarding from './routes/onboarding.js';

const app = new Hono({ strict: false });

app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);

app.get('/health', async (c) => {
  const [{ now }] = await sql`SELECT now()`;
  return c.json({ status: 'ok', time: now });
});

// Better Auth endpoints
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// 公開エンドポイント (LINEプラットフォームから呼ばれる)
app.route('/webhooks/line', lineWebhook);

// Onboarding (認証必須、テナント未登録でも可)
app.route('/api/v1/onboarding', onboarding);

// 管理API (認証 + テナント必須)
app.route('/api/v1/line-channels', lineChannels);
app.route('/api/v1/messages', messages);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Toique backend listening on :${port}`);
});

export default app;
