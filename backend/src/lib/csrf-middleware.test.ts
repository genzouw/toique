import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';

describe('applyCsrfMiddleware', () => {
  beforeEach(() => {
    // 確定値で allowedOrigins をスタブする。
    // CORS_ORIGIN は frontend-origin.ts のモジュール初期化時に読み取られるため、
    // テストごとに resetModules() を呼んで再評価させる。
    vi.resetModules();
    vi.stubEnv('CORS_ORIGIN', 'https://allowed.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  async function buildAppWithCsrf() {
    const { applyCsrfMiddleware } = await import('./csrf-middleware.js');
    const app = new Hono();
    applyCsrfMiddleware(app);
    app.get('/api/foo', (c) => c.text('ok'));
    app.post('/api/foo', (c) => c.text('ok'));
    return app;
  }

  describe('state-changing requests (POST)', () => {
    it('rejects POST without Origin header', async () => {
      const app = await buildAppWithCsrf();

      const res = await app.request('/api/foo', { method: 'POST' });

      expect(res.status).toBe(403);
    });

    it('accepts POST from an allowed Origin', async () => {
      const app = await buildAppWithCsrf();

      const res = await app.request('/api/foo', {
        method: 'POST',
        headers: { Origin: 'https://allowed.example.com' },
      });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('ok');
    });

    it('rejects POST from a disallowed Origin', async () => {
      const app = await buildAppWithCsrf();

      const res = await app.request('/api/foo', {
        method: 'POST',
        headers: { Origin: 'https://evil.example.com' },
      });

      expect(res.status).toBe(403);
    });
  });

  describe('safe methods (GET)', () => {
    it('accepts GET without Origin header (CSRF does not apply)', async () => {
      const app = await buildAppWithCsrf();

      const res = await app.request('/api/foo', { method: 'GET' });

      expect(res.status).toBe(200);
      expect(await res.text()).toBe('ok');
    });

    it('accepts GET from a disallowed Origin (CSRF does not apply to GET)', async () => {
      const app = await buildAppWithCsrf();

      const res = await app.request('/api/foo', {
        method: 'GET',
        headers: { Origin: 'https://evil.example.com' },
      });

      expect(res.status).toBe(200);
    });
  });

  describe('scope', () => {
    it('does not apply CSRF to paths outside /api/*', async () => {
      const { applyCsrfMiddleware } = await import('./csrf-middleware.js');
      const app = new Hono();
      applyCsrfMiddleware(app);
      app.post('/webhooks/external', (c) => c.text('webhook ok'));

      const res = await app.request('/webhooks/external', {
        method: 'POST',
        headers: { Origin: 'https://evil.example.com' },
      });

      expect(res.status).toBe(200);
    });
  });
});
