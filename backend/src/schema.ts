import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// LINE公式アカウント (テナントが登録する)
export const lineChannels = pgTable('line_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelId: text('channel_id').notNull().unique(),
  channelSecret: text('channel_secret').notNull(),
  channelAccessToken: text('channel_access_token').notNull(),
  displayName: text('display_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// LINEユーザー (問い合わせ者)
export const lineUsers = pgTable(
  'line_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineChannelId: uuid('line_channel_id')
      .notNull()
      .references(() => lineChannels.id, { onDelete: 'cascade' }),
    lineUserId: text('line_user_id').notNull(),
    displayName: text('display_name'),
    pictureUrl: text('picture_url'),
    language: text('language'),
    followedAt: timestamp('followed_at', { withTimezone: true }),
    unfollowedAt: timestamp('unfollowed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.lineChannelId, t.lineUserId)],
);

// 受信メッセージ (Phase 1 では汎用的にイベントを記録)
export const inboundMessages = pgTable('inbound_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  lineChannelId: uuid('line_channel_id')
    .notNull()
    .references(() => lineChannels.id, { onDelete: 'cascade' }),
  lineUserId: uuid('line_user_id').references(() => lineUsers.id, {
    onDelete: 'set null',
  }),
  eventType: text('event_type').notNull(), // message / follow / unfollow / postback
  messageType: text('message_type'), // text / image / video / etc
  text: text('text'),
  rawEvent: jsonb('raw_event').notNull(),
  receivedAt: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
