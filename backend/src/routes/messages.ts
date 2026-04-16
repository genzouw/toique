import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import db from '../db.js';
import { inboundMessages, lineChannels } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  const rows = await db
    .select({
      id: inboundMessages.id,
      lineChannelId: inboundMessages.lineChannelId,
      lineUserId: inboundMessages.lineUserId,
      eventType: inboundMessages.eventType,
      messageType: inboundMessages.messageType,
      text: inboundMessages.text,
      rawEvent: inboundMessages.rawEvent,
      receivedAt: inboundMessages.receivedAt,
    })
    .from(inboundMessages)
    .innerJoin(lineChannels, eq(lineChannels.id, inboundMessages.lineChannelId))
    .where(eq(lineChannels.tenantId, tenant.id))
    .orderBy(desc(inboundMessages.receivedAt))
    .limit(100);
  return c.json(rows);
});

export default app;
