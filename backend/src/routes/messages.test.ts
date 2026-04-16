import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import { lineChannels, inboundMessages } from '../schema.js';
import messagesRoute from './messages.js';

const TEST_CHANNEL_ID = 'msg-test-channel';

describe('messages route', () => {
  let channelRowId: string;

  beforeEach(async () => {
    await db
      .delete(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
    const [c] = await db
      .insert(lineChannels)
      .values({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Msg Test',
      })
      .returning({ id: lineChannels.id });
    channelRowId = c.id;
  });

  it('GET /api/v1/messages returns rows ordered by receivedAt desc', async () => {
    await db.insert(inboundMessages).values([
      {
        lineChannelId: channelRowId,
        eventType: 'message',
        messageType: 'text',
        text: 'first',
        rawEvent: { type: 'message' } as Record<string, unknown>,
        receivedAt: new Date('2026-04-15T10:00:00Z'),
      },
      {
        lineChannelId: channelRowId,
        eventType: 'message',
        messageType: 'text',
        text: 'second',
        rawEvent: { type: 'message' } as Record<string, unknown>,
        receivedAt: new Date('2026-04-16T10:00:00Z'),
      },
    ]);

    const app = new Hono();
    app.route('/api/v1/messages', messagesRoute);
    const res = await app.request('/api/v1/messages');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ text: string }>;
    expect(body.length).toBeGreaterThanOrEqual(2);
    // 直近が先頭
    const firstSeen = body.findIndex((m) => m.text === 'first');
    const secondSeen = body.findIndex((m) => m.text === 'second');
    expect(secondSeen).toBeLessThan(firstSeen);
  });
});
