import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import db from '../../db.js';
import { lineChannels, lineUsers, inboundMessages } from '../../schema.js';
import { handleLineEvent } from './event-handler.js';
import type { LineMessageEvent } from './types.js';

const TEST_CHANNEL_ID = 'test-evt-channel';
const TEST_SECRET = 'sec';
const TEST_TOKEN = 'tok';
const TEST_USER_ID = 'Uxxxxxxxxxxxxxxx';

async function getTestChannel() {
  const [c] = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.channelId, TEST_CHANNEL_ID))
    .limit(1);
  return c!;
}

describe('handleLineEvent', () => {
  beforeEach(async () => {
    await db
      .insert(lineChannels)
      .values({
        channelId: TEST_CHANNEL_ID,
        channelSecret: TEST_SECRET,
        channelAccessToken: TEST_TOKEN,
        displayName: 'EvtTest',
        isActive: true,
      })
      .onConflictDoNothing();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    const ch = await getTestChannel();
    if (ch) {
      await db
        .delete(inboundMessages)
        .where(eq(inboundMessages.lineChannelId, ch.id));
      await db.delete(lineUsers).where(eq(lineUsers.lineChannelId, ch.id));
      await db.delete(lineChannels).where(eq(lineChannels.id, ch.id));
    }
  });

  it('saves a text message and replies with the same text (echo)', async () => {
    const channel = await getTestChannel();
    const event: LineMessageEvent = {
      type: 'message',
      replyToken: 'rt-1',
      source: { type: 'user', userId: TEST_USER_ID },
      timestamp: Date.now(),
      message: { type: 'text', id: 'm1', text: 'hello world' },
    };

    await handleLineEvent(channel, event);

    const saved = await db
      .select()
      .from(inboundMessages)
      .where(eq(inboundMessages.lineChannelId, channel.id));
    expect(saved).toHaveLength(1);
    expect(saved[0].eventType).toBe('message');
    expect(saved[0].messageType).toBe('text');
    expect(saved[0].text).toBe('hello world');

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.replyToken).toBe('rt-1');
    expect(body.messages).toEqual([{ type: 'text', text: 'hello world' }]);
  });

  it('upserts a line_user record on first message', async () => {
    const channel = await getTestChannel();
    const event: LineMessageEvent = {
      type: 'message',
      replyToken: 'rt-2',
      source: { type: 'user', userId: TEST_USER_ID },
      timestamp: Date.now(),
      message: { type: 'text', id: 'm2', text: 'hi' },
    };

    await handleLineEvent(channel, event);

    const users = await db
      .select()
      .from(lineUsers)
      .where(eq(lineUsers.lineChannelId, channel.id));
    expect(users).toHaveLength(1);
    expect(users[0].lineUserId).toBe(TEST_USER_ID);
  });
});
