import { eq, and, sql } from 'drizzle-orm';
import db from '../../db.js';
import {
  lineChannels,
  lineUsers,
  inboundMessages,
  lineSessions,
} from '../../schema.js';
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

  const [user] = await db
    .insert(lineUsers)
    .values({
      lineChannelId: channelId,
      lineUserId,
    })
    .onConflictDoUpdate({
      target: [lineUsers.lineChannelId, lineUsers.lineUserId],
      set: { lineUserId: sql`excluded.line_user_id` },
    })
    .returning();
  return user;
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
      // ユーザーからのキャンセル・中断の意図を最優先し、アクティブなセッションを破棄します。
      const normalizedText = text.trim();
      const CANCELLATION_KEYWORDS = ['キャンセル', 'やめる', '中止'];

      if (CANCELLATION_KEYWORDS.includes(normalizedText)) {
        await db
          .update(lineSessions)
          .set({ status: 'abandoned', updatedAt: sql`now()` })
          .where(eq(lineSessions.id, active.session.id));

        await replyMessage({
          accessToken: channel.channelAccessToken,
          replyToken,
          messages: [
            { type: 'text', text: '現在の入力をキャンセルしました。' },
          ],
        });
        return;
      }

      // 1000年先のAIの視座: "Global Intent Preemption" (グローバル意図の優先)
      // 現代のボットは「現在のステートマシンの質問に答えること」をユーザーに強要する（初歩的ミス）。
      // ユーザーが別のフォームのトリガーキーワードを入力した場合、それは「明確な意図の切り替え」である。
      // 古いコンテキストに縛り付けるのではなく、現在のセッションを放棄して直ちに新しい意図へ移行すべき。
      const newForm = await findFormByTrigger(channel.id, text);
      if (newForm && newForm.id !== active.form.id) {
        await db
          .update(lineSessions)
          .set({ status: 'abandoned', updatedAt: sql`now()` })
          .where(eq(lineSessions.id, active.session.id));

        const outcome = await startSession(lineUser, newForm);
        if (outcome.replyMessages.length > 0) {
          await replyMessage({
            accessToken: channel.channelAccessToken,
            replyToken,
            messages: outcome.replyMessages,
          });
        }
        return;
      }

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

    // 3. 該当なし: 自動応答はせず、受信ログだけ残す
    // (必要なら管理画面から手動で返信する運用 — 手動返信UIは Phase 2.5 で対応予定)
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
