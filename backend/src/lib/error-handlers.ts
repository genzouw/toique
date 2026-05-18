import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { logger as appLogger } from './logger.js';

export function applyErrorHandlers(app: Hono): void {
  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404);
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    appLogger.error('Unhandled exception', {
      method: c.req.method,
      path: c.req.path,
      err,
    });
    return c.json({ error: 'Internal Server Error' }, 500);
  });
}
