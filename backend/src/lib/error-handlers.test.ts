import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { applyErrorHandlers } from './error-handlers.js';

describe('applyErrorHandlers', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('notFound', () => {
    it('returns 404 JSON for unmatched routes', async () => {
      const app = new Hono();
      applyErrorHandlers(app);

      const res = await app.request('/__nonexistent__');

      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Not Found' });
    });
  });

  describe('onError', () => {
    it('passes HTTPException through using getResponse()', async () => {
      const app = new Hono();
      app.get('/boom', () => {
        throw new HTTPException(401, { message: 'unauthorized' });
      });
      applyErrorHandlers(app);

      const res = await app.request('/boom');

      expect(res.status).toBe(401);
      expect(await res.text()).toBe('unauthorized');
      // HTTPException 経路では console.error は呼ばれない
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('returns generic 500 without leaking stack for unexpected errors', async () => {
      const app = new Hono();
      app.get('/explode', () => {
        throw new Error('SECRET_INTERNAL_INFO');
      });
      applyErrorHandlers(app);

      const res = await app.request('/explode');

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: 'Internal Server Error' });
      // クライアントレスポンスに内部情報や stack が漏れていない
      expect(JSON.stringify(body)).not.toContain('SECRET_INTERNAL_INFO');
    });

    it('logs unexpected errors with method and path context', async () => {
      const app = new Hono();
      app.post('/api/v1/foo/bar', () => {
        throw new Error('boom');
      });
      applyErrorHandlers(app);

      await app.request('/api/v1/foo/bar', { method: 'POST' });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      const [message, context] = errorSpy.mock.calls[0];
      expect(message).toBe('Unhandled exception');
      expect(context).toMatchObject({
        method: 'POST',
        path: '/api/v1/foo/bar',
      });
      expect((context as { err: Error }).err).toBeInstanceOf(Error);
      expect((context as { err: Error }).err.message).toBe('boom');
    });
  });
});
