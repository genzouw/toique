import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { serve } from '@hono/node-server';
import { sql } from './db.js';
import { auth } from './auth/better-auth.js';
import { requireOperator, requireTenant } from './middleware/auth.js';
import lineWebhook from './routes/webhooks/line.js';
import stripeWebhook from './routes/webhooks/stripe.js';
import billing from './routes/billing.js';
import lineChannels from './routes/line-channels.js';
import messages from './routes/messages.js';
import onboarding from './routes/onboarding.js';
import forms from './routes/forms.js';
import submissions from './routes/submissions.js';
import usage from './routes/usage.js';
import contact from './routes/contact.js';
import adminContacts from './routes/admin/contacts.js';
import adminMe from './routes/admin/me.js';
import adminUsers from './routes/admin/users.js';
import { logger as appLogger } from './lib/logger.js';
import { securityHeadersConfig } from './lib/security-headers.js';
import { allowedOrigins } from './lib/frontend-origin.js';
import { applyCsrfMiddleware } from './lib/csrf-middleware.js';
import { applyErrorHandlers } from './lib/error-handlers.js';

const app = new Hono({ strict: false });

// 全リクエストをログ出力 (method / path / status / duration)
// ロガーを最外層に配置し、後続ミドルウェア（secureHeaders など）の処理時間も含めて計測する
app.use('*', logger());

// セキュリティヘッダーを付与
app.use('*', secureHeaders(securityHeadersConfig));

// CSRF 保護 (詳細・適用範囲は lib/csrf-middleware.ts のコメント参照)
applyCsrfMiddleware(app);

app.use(
  '/api/*',
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
    credentials: true,
  }),
);

app.get('/health', async (c) => {
  const [{ now }] = await sql`SELECT now()`;
  return c.json({ status: 'ok', time: now });
});

// Better Auth endpoints
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

// 公開エンドポイント (外部プラットフォームから呼ばれる)
app.route('/webhooks/line', lineWebhook);
app.route('/webhooks/stripe', stripeWebhook);

// Onboarding (認証必須、テナント未登録でも可)
app.route('/api/v1/onboarding', onboarding);

// 管理API (認証 + テナント必須)
app.use('/api/v1/line-channels/*', requireTenant);
app.route('/api/v1/line-channels', lineChannels);

app.use('/api/v1/messages/*', requireTenant);
app.route('/api/v1/messages', messages);

app.use('/api/v1/forms/*', requireTenant);
app.route('/api/v1/forms', forms);

app.use('/api/v1/submissions/*', requireTenant);
app.route('/api/v1/submissions', submissions);

app.use('/api/v1/usage', requireTenant);
app.route('/api/v1/usage', usage);

app.use('/api/v1/billing/*', requireTenant);
app.route('/api/v1/billing', billing);

// 公開フォーム送信 (誰でもPOST可、レート制限+ハニーポット)
app.route('/api/v1/contact', contact);

// 運営者限定API (URLプレフィックスで一括ガード)
app.use('/api/v1/admin/*', requireOperator);
app.route('/api/v1/admin/me', adminMe);
app.route('/api/v1/admin/contacts', adminContacts);
app.route('/api/v1/admin/users', adminUsers);

applyErrorHandlers(app);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  appLogger.info(`Toique backend listening on :${port}`);
});

export default app;
