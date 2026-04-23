import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

// -----------------------------
// Better Auth core tables
// -----------------------------
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// -----------------------------
// Tenancy
// -----------------------------
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  plan: text('plan').notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Phase 2a では 1ユーザー = 1テナント (user_id に UNIQUE)
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('admin'), // admin / operator / viewer
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('tenant_members_user_id_key').on(t.userId)],
);

// -----------------------------
// LINE domain (tenant-scoped)
// -----------------------------
export const lineChannels = pgTable('line_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  channelId: text('channel_id').notNull().unique(),
  channelSecret: text('channel_secret').notNull(),
  channelAccessToken: text('channel_access_token').notNull(),
  displayName: text('display_name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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

export const inboundMessages = pgTable(
  'inbound_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineChannelId: uuid('line_channel_id')
      .notNull()
      .references(() => lineChannels.id, { onDelete: 'cascade' }),
    lineUserId: uuid('line_user_id').references(() => lineUsers.id, {
      onDelete: 'set null',
    }),
    eventType: text('event_type').notNull(),
    messageType: text('message_type'),
    text: text('text'),
    rawEvent: jsonb('raw_event').notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Added composite index on lineChannelId and receivedAt to prevent sequential scans when fetching recent messages per channel.
    index('inbound_messages_line_channel_id_received_at_idx').on(
      t.lineChannelId,
      t.receivedAt,
    ),
  ],
);

// -----------------------------
// Forms (Phase 3)
// -----------------------------
export const forms = pgTable('forms', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  lineChannelId: uuid('line_channel_id')
    .notNull()
    .references(() => lineChannels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: text('status').notNull().default('draft'), // draft / published / archived
  triggerKeyword: text('trigger_keyword'),
  schema: jsonb('schema').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lineSessions = pgTable(
  'line_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lineUserId: uuid('line_user_id')
      .notNull()
      .references(() => lineUsers.id, { onDelete: 'cascade' }),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    currentStep: text('current_step').notNull(),
    answers: jsonb('answers').notNull().default({}),
    status: text('status').notNull().default('in_progress'), // in_progress / completed / abandoned
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [unique('line_sessions_user_form_key').on(t.lineUserId, t.formId)],
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    formId: uuid('form_id')
      .notNull()
      .references(() => forms.id, { onDelete: 'cascade' }),
    lineUserId: uuid('line_user_id')
      .notNull()
      .references(() => lineUsers.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').notNull(),
    status: text('status').notNull().default('new'), // new / in_review / done
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Added composite index on tenantId and submittedAt to speed up quota counting and dashboard queries without sequential scans.
    index('submissions_tenant_id_submitted_at_idx').on(
      t.tenantId,
      t.submittedAt,
    ),
    // Added composite index on formId and submittedAt to optimize fetching and CSV exporting of submissions for a specific form.
    index('submissions_form_id_submitted_at_idx').on(t.formId, t.submittedAt),
  ],
);

// -----------------------------
// Contacts (Toique 運営者向け問い合わせ)
// -----------------------------
// 契約者・見込み客からの問い合わせを保存。
// 閲覧は OPERATOR_EMAILS に登録された運営者のみ。
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ログイン済みユーザーからの問い合わせなら紐付け。未ログインは null
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  tenantId: uuid('tenant_id').references(() => tenants.id, {
    onDelete: 'set null',
  }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  category: text('category').notNull(), // bug / feature / pricing / consultation / other
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  url: text('url'),
  status: text('status').notNull().default('new'), // new / in_review / done
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
