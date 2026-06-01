import { Hono } from 'hono';
import { z } from 'zod';
import { lineSignature } from '../../middleware/line-signature.js';
import { handleLineEvent } from '../../lib/line/event-handler.js';
import { logger } from '../../lib/logger.js';
import type { LineWebhookPayload } from '../../lib/line/types.js';
import type { lineChannels } from '../../schema.js';

type Channel = typeof lineChannels.$inferSelect;

// LINE Webhook ペイロードの境界検証スキーマ。
// イベント本体の詳細は handleLineEvent 側で type ごとに扱うため、
// ここでは「events が配列で各要素がオブジェクト」だけを最低限保証する。
const lineWebhookEventSchema = z.object({}).passthrough();
const lineWebhookPayloadSchema = z.object({
  destination: z.string(),
  events: z.array(lineWebhookEventSchema),
});

const app = new Hono();

app.post('/:channelId', lineSignature, async (c) => {
  const rawBody = c.get('rawBody' as never) as string;
  const channel = c.get('lineChannel' as never) as Channel;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return c.text('Invalid JSON', 400);
  }

  const result = lineWebhookPayloadSchema.safeParse(parsed);
  if (!result.success) {
    logger.error('[line-webhook] invalid payload', {
      issues: result.error.issues,
    });
    return c.text('Invalid payload', 400);
  }
  const payload = result.data as LineWebhookPayload;

  // 3秒ルール対策: 即座に200返却し、処理は非同期化
  queueMicrotask(async () => {
    for (const event of payload.events) {
      try {
        await handleLineEvent(channel, event);
      } catch (err) {
        logger.error('[line-webhook] event handling failed', err);
      }
    }
  });

  return c.json({ ok: true });
});

export default app;
