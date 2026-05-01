import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import db from '../db.js';
import { inboundMessages, lineChannels } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const tenant = c.get('tenant');
  // ⚡ Bolt: Exclude the large JSON 'rawEvent' column from list endpoints to reduce db I/O and payload size.
  const rows = await db
    .select({
      id: inboundMessages.id,
      lineChannelId: inboundMessages.lineChannelId,
      lineUserId: inboundMessages.lineUserId,
      eventType: inboundMessages.eventType,
      messageType: inboundMessages.messageType,
      text: inboundMessages.text,
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
