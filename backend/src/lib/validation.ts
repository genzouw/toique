import { zValidator } from '@hono/zod-validator';
import type { z } from 'zod';

// リクエストボディを zod で検証する。
// 失敗時は既存のハンドラと同じく text の 400 を返す（frontend は res.text() で本文を表示する）。
export const jsonBody = <T extends z.ZodType>(schema: T) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      const message = result.error.issues
        .map((i) => i.path.join('.') + ': ' + i.message)
        .join('; ');
      return c.text(message, 400);
    }
  });
