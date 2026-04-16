import { eq, and, sql } from 'drizzle-orm';
import db from '../../db.js';
import { lineChannels, lineUsers, inboundMessages } from '../../schema.js';
import { replyMessage } from './client.js';
import type { LineWebhookEvent } from './types.js';

type Channel = typeof lineChannels.$inferSelect;

async function upsertLineUser(
  channelId: string,
  lineUserId: string,
): Promise<string | null> {
  if (!lineUserId) return null;

  const existing = await db
    .select()
    .from(lineUsers)
    .where(
      and(
        eq(lineUsers.lineChannelId, channelId),
        eq(lineUsers.lineUserId, lineUserId),
      ),
    )
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [created] = await db
    .insert(lineUsers)
    .values({
      lineChannelId: channelId,
      lineUserId,
    })
    .returning({ id: lineUsers.id });
  return created.id;
}

export async function handleLineEvent(
  channel: Channel,
  event: LineWebhookEvent,
): Promise<void> {
  const sourceUserId =
    'source' in event && event.source?.type === 'user'
      ? event.source.userId
      : undefined;
  const lineUserRowId = sourceUserId
    ? await upsertLineUser(channel.id, sourceUserId)
    : null;

  if (event.type === 'message') {
    await db.insert(inboundMessages).values({
      lineChannelId: channel.id,
      lineUserId: lineUserRowId,
      eventType: 'message',
      messageType: event.message.type,
      text: event.message.type === 'text' ? event.message.text : null,
      rawEvent: event as unknown as Record<string, unknown>,
    });

    if (event.message.type === 'text') {
      await replyMessage({
        accessToken: channel.channelAccessToken,
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: event.message.text }],
      });
    }
    return;
  }

  if (event.type === 'follow') {
    if (sourceUserId) {
      await db
        .update(lineUsers)
        .set({ followedAt: sql`now()`, unfollowedAt: null })
        .where(
          and(
            eq(lineUsers.lineChannelId, channel.id),
            eq(lineUsers.lineUserId, sourceUserId),
          ),
        );
    }
    await db.insert(inboundMessages).values({
      lineChannelId: channel.id,
      lineUserId: lineUserRowId,
      eventType: 'follow',
      rawEvent: event as unknown as Record<string, unknown>,
    });
    return;
  }

  if (event.type === 'unfollow') {
    if (sourceUserId) {
      await db
        .update(lineUsers)
        .set({ unfollowedAt: sql`now()` })
        .where(
          and(
            eq(lineUsers.lineChannelId, channel.id),
            eq(lineUsers.lineUserId, sourceUserId),
          ),
        );
    }
    await db.insert(inboundMessages).values({
      lineChannelId: channel.id,
      lineUserId: lineUserRowId,
      eventType: 'unfollow',
      rawEvent: event as unknown as Record<string, unknown>,
    });
    return;
  }

  if (event.type === 'postback') {
    await db.insert(inboundMessages).values({
      lineChannelId: channel.id,
      lineUserId: lineUserRowId,
      eventType: 'postback',
      rawEvent: event as unknown as Record<string, unknown>,
    });
    return;
  }
}
