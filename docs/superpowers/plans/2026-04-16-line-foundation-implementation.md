# LINE連携基盤 実装計画 (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** LINE公式アカウントから受信したメッセージをWebhookで受信し、署名検証→DB保存→オウム返し応答まで通しで動作する最小バックエンドを構築する。フロントエンドは含まず、HTTP API (curl) で動作確認する。

**Architecture:** Hono 4 によるWebhookエンドポイント + Drizzle ORM + PostgreSQL 17 のシンプル3層構成。LINEへのメッセージ送信は自前の fetch ベースクライアント (SDK 不使用)。マルチテナント対応のため、Webhook URL は `/webhooks/line/:channelId` 形式とし、各チャネルの Channel Secret で個別に署名検証する。テストは Vitest によるユニットテスト中心、Webhook の通し動作は手動確認。

**Tech Stack:**

- Backend: Hono 4.7 / TypeScript 5.8 / Node.js 22+ (`@hono/node-server`)
- ORM: Drizzle ORM 0.45 + drizzle-kit / postgres-js 3.4
- DB: PostgreSQL 17 (Docker Compose)
- Test: Vitest 4
- Tunnel: ngrok (ローカル動作確認用、開発者各自インストール)

---

## File Structure

```
toique/
├── backend/
│   ├── Dockerfile
│   ├── drizzle.config.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts                    # Hono アプリのエントリ
│       ├── db.ts                       # Drizzle + postgres クライアント
│       ├── schema.ts                   # 全テーブル定義
│       ├── lib/
│       │   └── line/
│       │       ├── signature.ts        # HMAC-SHA256 署名検証関数
│       │       ├── client.ts           # LINE Messaging API クライアント
│       │       └── types.ts            # Webhook イベント型定義
│       ├── middleware/
│       │   └── line-signature.ts       # 署名検証 Hono ミドルウェア
│       └── routes/
│           ├── webhooks/
│           │   └── line.ts             # POST /webhooks/line/:channelId
│           ├── line-channels.ts        # GET/POST/DELETE /api/v1/line-channels
│           └── messages.ts             # GET /api/v1/messages
├── db/
│   └── migrations/                     # drizzle-kit が生成
├── compose.yml                         # backend + postgres
├── .env.example
├── .dockerignore
└── README.md                           # 動作確認手順を含む
```

**責務分離:**

- `lib/line/signature.ts`: 純粋関数。`(channelSecret, rawBody, signature) => boolean`
- `lib/line/client.ts`: LINE API への HTTP 呼び出し。`replyMessage(accessToken, replyToken, messages)` 等
- `middleware/line-signature.ts`: Hono ミドルウェア。チャネル取得 + 署名検証 + コンテキスト注入
- `routes/webhooks/line.ts`: Webhook ハンドラ。イベントディスパッチ + DB保存 + 応答
- `routes/line-channels.ts`: チャネル登録の管理API（認証はPhase 2で追加）
- `routes/messages.ts`: 受信メッセージの確認用API（認証はPhase 2で追加）

---

## Task 0: プロジェクト基盤セットアップ

**Files:**

- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/drizzle.config.ts`
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `compose.yml`
- Create: `.env.example`
- Create: `.dockerignore` (リポジトリルート)

- [ ] **Step 0.1: backend/package.json を作成**

```json
{
  "name": "toique-backend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@hono/node-server": "^1.14.0",
    "drizzle-orm": "^0.45.2",
    "hono": "^4.7.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.31.10",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 0.2: backend/tsconfig.json を作成**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false,
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 0.3: backend/vitest.config.ts を作成**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 0.4: backend/drizzle.config.ts を作成**

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: '../db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 0.5: backend/Dockerfile を作成**

```dockerfile
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

- [ ] **Step 0.6: backend/.dockerignore を作成**

```
node_modules
dist
.env
*.log
```

- [ ] **Step 0.7: リポジトリルートの compose.yml を作成**

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: toique
      POSTGRES_PASSWORD: toique
      POSTGRES_DB: toique
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U toique']
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build:
      context: ./backend
      target: dev
    ports:
      - '3000:3000'
    environment:
      DATABASE_URL: postgresql://toique:toique@db:5432/toique
      PORT: '3000'
    volumes:
      - ./backend/src:/app/src
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
```

- [ ] **Step 0.8: リポジトリルートの .env.example を作成**

```
# Backend
DATABASE_URL=postgresql://toique:toique@localhost:5432/toique
PORT=3000
```

- [ ] **Step 0.9: backend で npm install 実行**

```bash
cd backend && npm install
```

Expected: `node_modules` が生成され、エラーなしで完了。

- [ ] **Step 0.10: コミット**

```bash
git add backend/package.json backend/package-lock.json backend/tsconfig.json \
        backend/vitest.config.ts backend/drizzle.config.ts \
        backend/Dockerfile backend/.dockerignore \
        compose.yml .env.example
git commit -m "chore: scaffold backend project with hono + drizzle + postgres"
```

---

## Task 1: 最小ヘルスチェックエンドポイント

`src/index.ts` と `src/db.ts` の最小実装で、サーバ起動と DB 接続を確認する。

**Files:**

- Create: `backend/src/db.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1.1: backend/src/db.ts を作成**

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const db = drizzle(client);

export default db;
export { client as sql };
```

- [ ] **Step 1.2: backend/src/index.ts を作成（ヘルスチェックのみ）**

```ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { sql } from './db.js';

const app = new Hono();

app.get('/health', async (c) => {
  const [{ now }] = await sql`SELECT now()`;
  return c.json({ status: 'ok', time: now });
});

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
```

- [ ] **Step 1.3: docker compose で起動して動作確認**

```bash
docker compose up -d db
sleep 3
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run dev &
sleep 3
curl -s http://localhost:3000/health
```

Expected: `{"status":"ok","time":"2026-04-16T..."}`

- [ ] **Step 1.4: dev サーバを停止**

```bash
kill %1 2>/dev/null || true
```

- [ ] **Step 1.5: コミット**

```bash
git add backend/src/db.ts backend/src/index.ts
git commit -m "feat: add health check endpoint with postgres connection"
```

---

## Task 2: データモデル定義 (Drizzle スキーマ)

LINE連携基盤に必要な最小限の3テーブル: `line_channels`, `line_users`, `inbound_messages`

**Files:**

- Create: `backend/src/schema.ts`

- [ ] **Step 2.1: backend/src/schema.ts を作成**

```ts
import {
  pgTable,
  uuid,
  text,
  integer,
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
```

- [ ] **Step 2.2: マイグレーション生成**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run db:generate
```

Expected: `db/migrations/0000_*.sql` が生成される。

- [ ] **Step 2.3: マイグレーション適用**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run db:migrate
```

Expected: `[✓] applied migrations`

- [ ] **Step 2.4: テーブルが作成されたことを確認**

```bash
docker compose exec -T db psql -U toique -d toique -c "\dt"
```

Expected: `line_channels`, `line_users`, `inbound_messages`, `__drizzle_migrations` が表示される。

- [ ] **Step 2.5: db/ をリポジトリルートにコミット**

```bash
git add backend/src/schema.ts db/migrations/
git commit -m "feat: add line_channels, line_users, inbound_messages schema"
```

---

## Task 3: LINE 署名検証ライブラリ (TDD)

純粋関数として実装。後続の middleware から呼び出される。

**Files:**

- Create: `backend/src/lib/line/signature.ts`
- Test: `backend/src/lib/line/signature.test.ts`

- [ ] **Step 3.1: 失敗するテストを書く**

ファイル: `backend/src/lib/line/signature.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyLineSignature } from './signature.js';

describe('verifyLineSignature', () => {
  const secret = 'test-channel-secret';
  const body = '{"events":[]}';
  const validSignature = createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  it('returns true for a valid signature', () => {
    expect(verifyLineSignature(secret, body, validSignature)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    expect(verifyLineSignature(secret, body, 'wrong-signature')).toBe(false);
  });

  it('returns false when the body has been tampered with', () => {
    expect(verifyLineSignature(secret, '{"events":[1]}', validSignature)).toBe(
      false,
    );
  });

  it('returns false when the secret differs', () => {
    expect(verifyLineSignature('other-secret', body, validSignature)).toBe(
      false,
    );
  });
});
```

- [ ] **Step 3.2: テストを実行して失敗を確認**

```bash
cd backend && npm test -- signature
```

Expected: `Cannot find module './signature.js'` または同等のエラーで FAIL。

- [ ] **Step 3.3: 最小実装を書く**

ファイル: `backend/src/lib/line/signature.ts`

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLineSignature(
  channelSecret: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = createHmac('sha256', channelSecret)
    .update(rawBody)
    .digest('base64');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 3.4: テストを再実行して成功を確認**

```bash
cd backend && npm test -- signature
```

Expected: 4 件すべて PASS。

- [ ] **Step 3.5: コミット**

```bash
git add backend/src/lib/line/signature.ts backend/src/lib/line/signature.test.ts
git commit -m "feat: add LINE webhook signature verification"
```

---

## Task 4: LINE Messaging API クライアント (TDD)

Reply API への送信機能。fetch ベース、SDK 不使用。

**Files:**

- Create: `backend/src/lib/line/client.ts`
- Test: `backend/src/lib/line/client.test.ts`

- [ ] **Step 4.1: 失敗するテストを書く**

ファイル: `backend/src/lib/line/client.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { replyMessage } from './client.js';

describe('replyMessage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the LINE reply endpoint with bearer token and JSON body', async () => {
    await replyMessage({
      accessToken: 'test-token',
      replyToken: 'reply-abc',
      messages: [{ type: 'text', text: 'hello' }],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.line.me/v2/bot/message/reply');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer test-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.replyToken).toBe('reply-abc');
    expect(body.messages).toEqual([{ type: 'text', text: 'hello' }]);
  });

  it('throws when LINE API returns a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Unauthorized', { status: 401 })),
    );

    await expect(
      replyMessage({
        accessToken: 'bad',
        replyToken: 'reply-abc',
        messages: [{ type: 'text', text: 'hello' }],
      }),
    ).rejects.toThrow(/401/);
  });
});
```

- [ ] **Step 4.2: テスト実行で失敗を確認**

```bash
cd backend && npm test -- client
```

Expected: `Cannot find module './client.js'` で FAIL。

- [ ] **Step 4.3: 最小実装**

ファイル: `backend/src/lib/line/client.ts`

```ts
export type LineTextMessage = { type: 'text'; text: string };
export type LineMessage = LineTextMessage; // 拡張余地

export type ReplyMessageInput = {
  accessToken: string;
  replyToken: string;
  messages: LineMessage[];
};

export async function replyMessage({
  accessToken,
  replyToken,
  messages,
}: ReplyMessageInput): Promise<void> {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${text}`);
  }
}
```

- [ ] **Step 4.4: テスト再実行で成功を確認**

```bash
cd backend && npm test -- client
```

Expected: 2 件 PASS。

- [ ] **Step 4.5: コミット**

```bash
git add backend/src/lib/line/client.ts backend/src/lib/line/client.test.ts
git commit -m "feat: add LINE reply message client"
```

---

## Task 5: LINE Webhook 型定義

ハンドラ実装で使う型を分離して定義する。

**Files:**

- Create: `backend/src/lib/line/types.ts`

- [ ] **Step 5.1: backend/src/lib/line/types.ts を作成**

```ts
// LINE Messaging API Webhook event types
// 公式仕様: https://developers.line.biz/ja/reference/messaging-api/#webhook-event-objects
// Phase 1 で扱うイベントのみ最小限定義する

export type LineSource = {
  type: 'user' | 'group' | 'room';
  userId?: string;
  groupId?: string;
  roomId?: string;
};

export type LineMessageContent =
  | { type: 'text'; id: string; text: string }
  | { type: 'image'; id: string; contentProvider: { type: string } }
  | { type: 'video'; id: string; contentProvider: { type: string } }
  | { type: 'audio'; id: string; contentProvider: { type: string } }
  | { type: 'file'; id: string; fileName: string; fileSize: number }
  | {
      type: 'location';
      id: string;
      address?: string;
      latitude: number;
      longitude: number;
    }
  | { type: 'sticker'; id: string; packageId: string; stickerId: string };

export type LineMessageEvent = {
  type: 'message';
  replyToken: string;
  source: LineSource;
  timestamp: number;
  message: LineMessageContent;
};

export type LineFollowEvent = {
  type: 'follow';
  replyToken: string;
  source: LineSource;
  timestamp: number;
};

export type LineUnfollowEvent = {
  type: 'unfollow';
  source: LineSource;
  timestamp: number;
};

export type LinePostbackEvent = {
  type: 'postback';
  replyToken: string;
  source: LineSource;
  timestamp: number;
  postback: { data: string };
};

export type LineWebhookEvent =
  | LineMessageEvent
  | LineFollowEvent
  | LineUnfollowEvent
  | LinePostbackEvent;

export type LineWebhookPayload = {
  destination: string;
  events: LineWebhookEvent[];
};
```

- [ ] **Step 5.2: TypeScript コンパイルが通ることを確認**

```bash
cd backend && npx tsc --noEmit
```

Expected: エラーなし。

- [ ] **Step 5.3: コミット**

```bash
git add backend/src/lib/line/types.ts
git commit -m "feat: add LINE webhook event type definitions"
```

---

## Task 6: 署名検証ミドルウェア (TDD)

`channelId` パラメータからチャネルを取得し、署名検証を実施。検証通過後、`lineChannel` と `rawBody` を context に注入する。

**Files:**

- Create: `backend/src/middleware/line-signature.ts`
- Test: `backend/src/middleware/line-signature.test.ts`

- [ ] **Step 6.1: 失敗するテストを書く**

ファイル: `backend/src/middleware/line-signature.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { lineSignature } from './line-signature.js';
import db from '../db.js';
import { lineChannels } from '../schema.js';
import { eq } from 'drizzle-orm';

const TEST_CHANNEL_ID = 'test-channel-1';
const TEST_SECRET = 'test-secret';

describe('lineSignature middleware', () => {
  beforeEach(async () => {
    await db
      .insert(lineChannels)
      .values({
        channelId: TEST_CHANNEL_ID,
        channelSecret: TEST_SECRET,
        channelAccessToken: 'token',
        displayName: 'Test',
        isActive: true,
      })
      .onConflictDoNothing();
  });

  afterEach(async () => {
    await db
      .delete(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
  });

  function buildApp() {
    const app = new Hono();
    app.post('/wh/:channelId', lineSignature, (c) => c.json({ ok: true }));
    return app;
  }

  it('returns 401 when signature header is missing', async () => {
    const app = buildApp();
    const res = await app.request(`/wh/${TEST_CHANNEL_ID}`, {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when channel does not exist', async () => {
    const app = buildApp();
    const body = '{}';
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('base64');
    const res = await app.request(`/wh/unknown-channel`, {
      method: 'POST',
      headers: { 'x-line-signature': sig },
      body,
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 when signature is invalid', async () => {
    const app = buildApp();
    const res = await app.request(`/wh/${TEST_CHANNEL_ID}`, {
      method: 'POST',
      headers: { 'x-line-signature': 'wrong' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('passes through with valid signature', async () => {
    const app = buildApp();
    const body = '{"events":[]}';
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('base64');
    const res = await app.request(`/wh/${TEST_CHANNEL_ID}`, {
      method: 'POST',
      headers: { 'x-line-signature': sig },
      body,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 6.2: テスト実行で失敗を確認**

このテストは DB を使うため、`docker compose up -d db` が起動済みである前提。

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- line-signature
```

Expected: モジュール未定義のエラーで FAIL。

- [ ] **Step 6.3: 最小実装を書く**

ファイル: `backend/src/middleware/line-signature.ts`

```ts
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
```

- [ ] **Step 6.4: テスト再実行で成功を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- line-signature
```

Expected: 4 件 PASS。

- [ ] **Step 6.5: コミット**

```bash
git add backend/src/middleware/line-signature.ts backend/src/middleware/line-signature.test.ts
git commit -m "feat: add line signature verification middleware"
```

---

## Task 7: イベントハンドラ (DB 保存 + オウム返し)

Webhook で受信した各イベントを DB に保存し、テキストメッセージにはオウム返しで応答する。

**Files:**

- Create: `backend/src/lib/line/event-handler.ts`
- Test: `backend/src/lib/line/event-handler.test.ts`

- [ ] **Step 7.1: 失敗するテストを書く**

ファイル: `backend/src/lib/line/event-handler.test.ts`

```ts
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
    await db
      .delete(inboundMessages)
      .where(eq(inboundMessages.lineChannelId, ch.id));
    await db.delete(lineUsers).where(eq(lineUsers.lineChannelId, ch.id));
    await db.delete(lineChannels).where(eq(lineChannels.id, ch.id));
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
```

- [ ] **Step 7.2: テスト失敗を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- event-handler
```

Expected: モジュール未定義で FAIL。

- [ ] **Step 7.3: 実装**

ファイル: `backend/src/lib/line/event-handler.ts`

```ts
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
```

- [ ] **Step 7.4: テスト再実行で成功を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- event-handler
```

Expected: 2 件 PASS。

- [ ] **Step 7.5: コミット**

```bash
git add backend/src/lib/line/event-handler.ts backend/src/lib/line/event-handler.test.ts
git commit -m "feat: persist inbound LINE events and echo text replies"
```

---

## Task 8: Webhook ルート

`POST /webhooks/line/:channelId` を実装。署名検証ミドルウェアを通し、即座に 200 を返してから非同期にイベント処理する。

**Files:**

- Create: `backend/src/routes/webhooks/line.ts`

- [ ] **Step 8.1: backend/src/routes/webhooks/line.ts を作成**

```ts
import { Hono } from 'hono';
import { lineSignature } from '../../middleware/line-signature.js';
import { handleLineEvent } from '../../lib/line/event-handler.js';
import type {
  LineWebhookPayload,
  LineWebhookEvent,
} from '../../lib/line/types.js';
import type { lineChannels } from '../../schema.js';

type Channel = typeof lineChannels.$inferSelect;

const app = new Hono();

app.post('/:channelId', lineSignature, async (c) => {
  const rawBody = c.get('rawBody' as never) as string;
  const channel = c.get('lineChannel' as never) as Channel;

  let payload: LineWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LineWebhookPayload;
  } catch {
    return c.text('Invalid JSON', 400);
  }

  // 3秒ルール対策: 即座に200返却し、処理は非同期化
  queueMicrotask(async () => {
    for (const event of payload.events as LineWebhookEvent[]) {
      try {
        await handleLineEvent(channel, event);
      } catch (err) {
        console.error('[line-webhook] event handling failed', err);
      }
    }
  });

  return c.json({ ok: true });
});

export default app;
```

- [ ] **Step 8.2: コミット**

```bash
git add backend/src/routes/webhooks/line.ts
git commit -m "feat: add LINE webhook route handler"
```

---

## Task 9: チャネル登録 API

LINE公式アカウントを Toique に登録するための管理 API。Phase 1 では認証なしで提供（Phase 2 で better-auth 追加）。

**Files:**

- Create: `backend/src/routes/line-channels.ts`
- Test: `backend/src/routes/line-channels.test.ts`

- [ ] **Step 9.1: 失敗するテストを書く**

ファイル: `backend/src/routes/line-channels.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import { lineChannels } from '../schema.js';
import lineChannelsRoute from './line-channels.js';

const TEST_CHANNEL_ID = 'crud-test-channel';

describe('line-channels routes', () => {
  beforeEach(async () => {
    await db
      .delete(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
  });

  function buildApp() {
    const app = new Hono();
    app.route('/api/v1/line-channels', lineChannelsRoute);
    return app;
  }

  it('POST creates a channel', async () => {
    const app = buildApp();
    const res = await app.request('/api/v1/line-channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Test Brand',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { channelId: string };
    expect(body.channelId).toBe(TEST_CHANNEL_ID);
  });

  it('GET returns a list including the created channel', async () => {
    const app = buildApp();
    await app.request('/api/v1/line-channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Test Brand',
      }),
    });
    const res = await app.request('/api/v1/line-channels');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ channelId: string }>;
    expect(body.some((c) => c.channelId === TEST_CHANNEL_ID)).toBe(true);
  });

  it('DELETE removes a channel by id', async () => {
    const app = buildApp();
    const created = await app.request('/api/v1/line-channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Test Brand',
      }),
    });
    const { id } = (await created.json()) as { id: string };
    const del = await app.request(`/api/v1/line-channels/${id}`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(204);

    const remaining = await db
      .select()
      .from(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
    expect(remaining).toHaveLength(0);
  });
});
```

- [ ] **Step 9.2: テスト失敗を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- line-channels
```

Expected: モジュール未定義で FAIL。

- [ ] **Step 9.3: 実装**

ファイル: `backend/src/routes/line-channels.ts`

```ts
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import db from '../db.js';
import { lineChannels } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const rows = await db.select().from(lineChannels);
  // Phase 1: 平文で返す（Phase 2 で secret/token をマスク化）
  return c.json(rows);
});

app.post('/', async (c) => {
  const body = (await c.req.json()) as {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
    displayName: string;
  };
  if (
    !body.channelId ||
    !body.channelSecret ||
    !body.channelAccessToken ||
    !body.displayName
  ) {
    return c.text('Missing required fields', 400);
  }

  const [created] = await db
    .insert(lineChannels)
    .values({
      channelId: body.channelId,
      channelSecret: body.channelSecret,
      channelAccessToken: body.channelAccessToken,
      displayName: body.displayName,
    })
    .returning();

  return c.json(created, 201);
});

app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(lineChannels).where(eq(lineChannels.id, id));
  return c.body(null, 204);
});

export default app;
```

- [ ] **Step 9.4: テスト再実行で成功を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- line-channels
```

Expected: 3 件 PASS。

- [ ] **Step 9.5: コミット**

```bash
git add backend/src/routes/line-channels.ts backend/src/routes/line-channels.test.ts
git commit -m "feat: add line-channels CRUD endpoints"
```

---

## Task 10: メッセージ確認 API

受信した `inbound_messages` を一覧で返す API。動作確認用。

**Files:**

- Create: `backend/src/routes/messages.ts`
- Test: `backend/src/routes/messages.test.ts`

- [ ] **Step 10.1: 失敗するテストを書く**

ファイル: `backend/src/routes/messages.test.ts`

```ts
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
      },
      {
        lineChannelId: channelRowId,
        eventType: 'message',
        messageType: 'text',
        text: 'second',
        rawEvent: { type: 'message' } as Record<string, unknown>,
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
```

- [ ] **Step 10.2: テスト失敗を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- messages
```

Expected: モジュール未定義で FAIL。

- [ ] **Step 10.3: 実装**

ファイル: `backend/src/routes/messages.ts`

```ts
import { Hono } from 'hono';
import { desc } from 'drizzle-orm';
import db from '../db.js';
import { inboundMessages } from '../schema.js';

const app = new Hono();

app.get('/', async (c) => {
  const rows = await db
    .select()
    .from(inboundMessages)
    .orderBy(desc(inboundMessages.receivedAt))
    .limit(100);
  return c.json(rows);
});

export default app;
```

- [ ] **Step 10.4: テスト再実行で成功を確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test -- messages
```

Expected: 1 件 PASS。

- [ ] **Step 10.5: コミット**

```bash
git add backend/src/routes/messages.ts backend/src/routes/messages.test.ts
git commit -m "feat: add inbound messages list endpoint"
```

---

## Task 11: アプリ統合 (index.ts にルート登録)

すべてのルートを `src/index.ts` にマウントし、サーバが起動できる状態にする。

**Files:**

- Modify: `backend/src/index.ts`

- [ ] **Step 11.1: backend/src/index.ts を更新**

```ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { sql } from './db.js';
import lineWebhook from './routes/webhooks/line.js';
import lineChannels from './routes/line-channels.js';
import messages from './routes/messages.js';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }),
);

app.get('/health', async (c) => {
  const [{ now }] = await sql`SELECT now()`;
  return c.json({ status: 'ok', time: now });
});

// 公開エンドポイント (LINEプラットフォームから呼ばれる)
app.route('/webhooks/line', lineWebhook);

// 管理API (Phase 1: 認証なし)
app.route('/api/v1/line-channels', lineChannels);
app.route('/api/v1/messages', messages);

const port = Number(process.env.PORT) || 3000;
serve({ fetch: app.fetch, port }, () => {
  console.log(`Toique backend listening on :${port}`);
});

export default app;
```

- [ ] **Step 11.2: 全テスト実行**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test
```

Expected: すべての test ファイルが PASS。

- [ ] **Step 11.3: 開発サーバ起動と疎通確認**

```bash
cd backend && DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run dev &
sleep 3
curl -s http://localhost:3000/health
curl -s http://localhost:3000/api/v1/line-channels
curl -s http://localhost:3000/api/v1/messages
kill %1 2>/dev/null || true
```

Expected:

- `/health` → `{"status":"ok",...}`
- `/api/v1/line-channels` → `[]` (またはテストで残ったレコード)
- `/api/v1/messages` → `[]` または既存メッセージ

- [ ] **Step 11.4: コミット**

```bash
git add backend/src/index.ts
git commit -m "feat: wire up routes and CORS in main app"
```

---

## Task 12: 動作確認手順 README

実機 LINE で動作確認するための手順を README に記載。

**Files:**

- Modify: `README.md`

- [ ] **Step 12.1: README.md を更新**

````markdown
# Toique（トイク）

> LINE問い合わせ受付 SaaS

LINE公式アカウントを接続し、対話型フォームで問い合わせを受け付け、構造化データとして管理画面で確認できる SaaS。

## ドキュメント

- [設計書（2026-04-16）](docs/superpowers/specs/2026-04-16-toique-line-inquiry-saas-design.md)
- [Phase 1 実装計画](docs/superpowers/plans/2026-04-16-line-foundation-implementation.md)

## ステータス

Phase 1 (LINE連携基盤) 実装中

## 開発環境

### 必要なもの

- Docker / Docker Compose
- Node.js 22+ （ローカル実行する場合）
- ngrok （LINE Webhook をローカルに公開する場合）

### 起動

```bash
# Postgres + Backend を起動
docker compose up -d

# ログ確認
docker compose logs -f backend

# 停止
docker compose down
```
````

### マイグレーション

初回および schema を変更したとき:

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run db:generate
DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run db:migrate
```

### テスト

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm test
```

## LINE 動作確認手順 (Phase 1)

### 1. LINE Developers で Messaging API チャネル作成

1. https://developers.line.biz/console/ にアクセス
2. プロバイダー作成 → 新規チャネル → Messaging API
3. 作成後、以下を控える:
   - **Channel ID** (Basic settings)
   - **Channel secret** (Basic settings)
   - **Channel access token (long-lived)** (Messaging API → Issue)

### 2. ngrok でローカルを公開

別ターミナルで:

```bash
ngrok http 3000
```

表示される `https://xxxx.ngrok-free.app` を控える。

### 3. Toique にチャネルを登録

```bash
curl -X POST http://localhost:3000/api/v1/line-channels \
  -H 'content-type: application/json' \
  -d '{
    "channelId": "ここにChannel ID",
    "channelSecret": "ここにChannel secret",
    "channelAccessToken": "ここにaccess token",
    "displayName": "テスト用チャネル"
  }'
```

レスポンスの `channelId` がそのまま Webhook URL のパスになる。

### 4. LINE Developers に Webhook URL を登録

LINE Developers Console → Messaging API 設定 →

- **Webhook URL**: `https://xxxx.ngrok-free.app/webhooks/line/<Channel ID>`
- **Use webhook**: ON
- **Auto-reply messages**: OFF
- **Greeting messages**: OFF (任意)

「Verify」ボタンを押して `Success` が出ることを確認。

### 5. LINE 公式アカウントを友だち追加

LINE Developers Console の Messaging API 設定タブにある QR コードをスマホの LINE で読み取る。

### 6. メッセージを送信

LINE で公式アカウントに「こんにちは」と送る。

期待される動作:

- 即座に「こんにちは」とオウム返しで返信される
- バックエンドのログに受信ログが出る
- `curl -s http://localhost:3000/api/v1/messages | jq` で受信内容を確認できる

```bash
curl -s http://localhost:3000/api/v1/messages | jq
```

## アーキテクチャ

参考リポジトリ構造: [genzouw/ptasuku](https://github.com/genzouw/ptasuku)

技術スタック:

- Backend: Hono + Drizzle ORM + PostgreSQL + (Phase 2: better-auth)
- Frontend: (Phase 2 で追加) React 19 + Vite + Tailwind 4

````

- [ ] **Step 12.2: コミット**

```bash
git add README.md
git commit -m "docs: add Phase 1 setup and LINE integration verification guide"
````

---

## Task 13: 通し動作確認 (手動)

実装が完了したら、以下のチェックリストで通し動作を確認する。

- [ ] **Step 13.1: クリーン環境で起動**

```bash
docker compose down -v   # 既存DBを削除
docker compose up -d db
sleep 5
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run db:migrate
DATABASE_URL=postgresql://toique:toique@localhost:5432/toique npm run dev
```

- [ ] **Step 13.2: ngrok を起動して URL を控える**

```bash
ngrok http 3000
```

- [ ] **Step 13.3: LINE公式アカウントの作成と認証情報取得**

LINE Developers Console で実施。Channel ID / Channel Secret / Access Token を取得。

- [ ] **Step 13.4: チャネル登録**

```bash
curl -X POST http://localhost:3000/api/v1/line-channels \
  -H 'content-type: application/json' \
  -d '{
    "channelId": "<取得したChannel ID>",
    "channelSecret": "<取得したChannel secret>",
    "channelAccessToken": "<取得したaccess token>",
    "displayName": "Phase1 動作確認"
  }'
```

- [ ] **Step 13.5: LINE Developers で Webhook 設定**

- Webhook URL: `https://<ngrok>/webhooks/line/<Channel ID>`
- Use webhook: ON
- Auto-reply: OFF
- 「Verify」を実行 → Success

- [ ] **Step 13.6: 公式アカウントを友だち追加**

QRコードから。

- [ ] **Step 13.7: テキストメッセージで動作確認**

LINE で「テスト」と送る。

- 即座に「テスト」と返信される
- `curl -s http://localhost:3000/api/v1/messages | jq` で受信内容が見える

- [ ] **Step 13.8: 画像メッセージで動作確認**

LINE で画像を送る。

- 返信は無いが（Phase 1 は text のみオウム返し）
- `inbound_messages` に `messageType=image`, `text=null` で記録される

- [ ] **Step 13.9: フォローイベント確認**

公式アカウントをブロック → 解除 で `unfollow` / `follow` イベントが記録される。

---

## Self-Review チェック結果

### Spec Coverage

設計書 §8.1 (Webhook受信フロー) → Task 6, 7, 8 でカバー
設計書 §8.2 (署名検証) → Task 3, 6
設計書 §8.3 (3秒ルール) → Task 8 で `queueMicrotask`
設計書 §8.4 (Reply/Push) → Task 4, 7 (Reply のみ実装、Push は Phase 1 不要)
設計書 §5.1 (line_channels), §5.3 (line_users) → Task 2
設計書 §5.5 (submissions), §5.4 (sessions), §5.6 (attachments) → **Phase 1 では未対応** (フォームエンジン Phase 2)
設計書 §7 のフォームビルダー、§10 管理画面 React → **Phase 2 で対応**
設計書 §11 セキュリティ (秘密情報暗号化) → **Phase 2 で対応** (本Phase は平文保存、README に明記必要)

### 既知の Phase 1 の限界（意図的に後回し）

- 認証・認可がない（管理 API は誰でも叩ける）
- LINEチャネルの `channelSecret` / `channelAccessToken` が DB 平文保存
- フォームエンジンなし（オウム返しのみ）
- 画像/ファイルダウンロード処理なし（受信ログのみ）
- フロントエンド管理画面なし
- マルチテナントの `school_id` (今後 `tenant_id`) が無く、フラットな構造

これらは Phase 2 (本格管理画面 + 認証) と Phase 3 (フォームエンジン) で対応する。

---

## 次のフェーズの予告

Phase 1 完了後、以下のいずれかに進む候補:

- **Phase 2a**: better-auth 導入 + マルチテナント (tenants テーブル)
- **Phase 2b**: フロントエンド管理画面 (チャネル管理 + 受信メッセージ閲覧)
- **Phase 3**: フォームエンジン (line_sessions, forms, submissions, attachments)
