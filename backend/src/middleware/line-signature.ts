import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { lineChannels } from '../schema.js';
import { verifyLineSignature } from '../lib/line/signature.js';

export const lineSignature: MiddlewareHandler = async (c, next) => {
  const channelId = c.req.param('channelId');
  if (!channelId) return c.text('Bad Request', 400);

  const signature = c.req.header('x-line-signature');
  if (!signature) return c.text('Missing signature', 401);

  const rawBody = await c.req.text();

  const [channel] = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.channelId, channelId))
    .limit(1);
  if (!channel || !channel.isActive) return c.text('Unknown channel', 404);

  if (!verifyLineSignature(channel.channelSecret, rawBody, signature)) {
    return c.text('Invalid signature', 401);
  }

  c.set('lineChannel' as never, channel);
  c.set('rawBody' as never, rawBody);
  await next();
};
