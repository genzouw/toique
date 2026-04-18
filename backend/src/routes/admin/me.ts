import { Hono } from 'hono';

const app = new Hono();

/**
 * GET /api/v1/admin/me
 * requireOperator で守られているため、到達時点で運営者確定。
 * フロントは 200 が返れば運営者、401 なら非運営者 と判定する。
 */
app.get('/', (c) => {
  return c.json({ ok: true });
});

export default app;
