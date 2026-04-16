import { eq, and, sql } from 'drizzle-orm';
import db from '../../db.js';
import { lineChannels, lineUsers, inboundMessages } from '../../schema.js';
import { replyMessage } from './client.js';
import type { LineWebhookEvent } from './types.js';
import {
  startSession,
  advanceSession,
  findActiveSession,
  findFormByTrigger,
} from '../forms/engine.js';

type Channel = typeof lineChannels.$inferSelect;
type LineUser = typeof lineUsers.$inferSelect;

async function upsertLineUser(
  channelId: string,
  lineUserId: string,
): Promise<LineUser | null> {
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

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(lineUsers)
    .values({
      lineChannelId: channelId,
      lineUserId,
    })
    .returning();
  return created;
}

export async function handleLineEvent(
  channel: Channel,
  event: LineWebhookEvent,
): Promise<void> {
  const sourceUserId =
    'source' in event && event.source?.type === 'user'
      ? event.source.userId
      : undefined;
  const lineUser = sourceUserId
    ? await upsertLineUser(channel.id, sourceUserId)
    : null;
  const lineUserRowId = lineUser?.id ?? null;

  if (event.type === 'message') {
    await db.insert(inboundMessages).values({
      lineChannelId: channel.id,
      lineUserId: lineUserRowId,
      eventType: 'message',
      messageType: event.message.type,
      text: event.message.type === 'text' ? event.message.text : null,
      rawEvent: event as unknown as Record<string, unknown>,
    });

    if (event.message.type !== 'text') return;
    if (!lineUser) return;

    const replyToken = event.replyToken;
    const text = event.message.text;

    // 1. アクティブセッションがあれば advance
    const active = await findActiveSession(lineUser.id);
    if (active) {
      const outcome = await advanceSession(
        lineUser,
        active.form,
        active.session,
        { kind: 'text', text },
      );
      if (outcome.replyMessages.length > 0) {
        await replyMessage({
          accessToken: channel.channelAccessToken,
          replyToken,
          messages: outcome.replyMessages,
        });
      }
      return;
    }

    // 2. trigger keyword に一致する form があれば新規セッション開始
    const form = await findFormByTrigger(channel.id, text);
    if (form) {
      const outcome = await startSession(lineUser, form);
      if (outcome.replyMessages.length > 0) {
        await replyMessage({
          accessToken: channel.channelAccessToken,
          replyToken,
          messages: outcome.replyMessages,
        });
      }
      return;
    }

    // 3. フォールバック: Phase 1 のオウム返し
    await replyMessage({
      accessToken: channel.channelAccessToken,
      replyToken,
      messages: [{ type: 'text', text }],
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

    if (!lineUser) return;
    const active = await findActiveSession(lineUser.id);
    if (!active) return;

    const outcome = await advanceSession(
      lineUser,
      active.form,
      active.session,
      { kind: 'postback', postbackData: event.postback.data },
    );
    if (outcome.replyMessages.length > 0) {
      await replyMessage({
        accessToken: channel.channelAccessToken,
        replyToken: event.replyToken,
        messages: outcome.replyMessages,
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
}
