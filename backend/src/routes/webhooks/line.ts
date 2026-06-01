import { Hono } from 'hono';
import { lineSignature } from '../../middleware/line-signature.js';
import { handleLineEvent } from '../../lib/line/event-handler.js';
import { logger } from '../../lib/logger.js';
import type { LineWebhookPayload } from '../../lib/line/types.js';
import type { lineChannels } from '../../schema.js';

type Channel = typeof lineChannels.$inferSelect;

const app = new Hono();

app.post('/:channelId', lineSignature, async (c) => {
  const rawBody = c.get('rawBody' as never) as string;
  const channel = c.get('lineChannel' as never) as Channel;

  let payload: LineWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LineWebhookPayload;
  } catch {
    return c.text('Invalid JSON', 400);
  }

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
