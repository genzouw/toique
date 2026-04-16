# Toique（トイク）— LINE問い合わせ受付 SaaS 設計書

> 作成日: 2026-04-16
> ステータス: ドラフト（打合せ前たたき台）
> サービス名（暫定）: **Toique（トイク）**

---

## 1. プロダクト概要

### 1.1 プロダクト定義

**「LINE上で動く、対話型フォーム受付 SaaS」**

契約企業が自社の LINE公式アカウントを Toique に接続すると、LINEユーザーからの問い合わせに対して、チャット形式で必要事項を順に回答してもらい、完了データを管理画面で受け取れる SaaS。

### 1.2 解決する課題

- LINE公式アカウント標準のチャット機能では、問い合わせ内容を構造化できない
- 個別のチャット対応は属人化・非効率
- フォームをWebで用意してもLINEからの導線でドロップする
- 業界別のヒアリング項目（買取査定の画像・会員登録の本人情報など）を柔軟に設計したい

### 1.3 想定ユースケース

| 業種       | 用途                               |
| ---------- | ---------------------------------- |
| 買取業     | 査定依頼受付（商品画像＋商品情報） |
| 不動産     | 内見予約、査定依頼                 |
| クリニック | 予約受付、問診票                   |
| 士業       | 初回相談受付                       |
| 保険       | 見積依頼                           |
| 求人       | エントリー受付                     |
| EC         | 商品問い合わせ、返品申請           |

買取査定は「1テンプレート」として提供される。

---

## 2. 事業方針

| 項目             | 決定                                                          |
| ---------------- | ------------------------------------------------------------- |
| 提供形態         | SaaS（当社がプロダクトオーナー、買取業者等を顧客として販売）  |
| マルチテナント   | 必須（1契約者＝1テナント。1テナントで複数LINEチャネル接続可） |
| フォーム設計方式 | ノーコードビルダー型（ドラッグ&ドロップ＋条件分岐）           |
| MVPスコープ      | 標準MVP（後述 §7）                                            |
| LINE連携方式     | LINE Messaging API 経由の契約者別 Webhook                     |
| 課金モデル       | 初期費用＋月額固定＋従量（問い合わせ件数）想定。要議論        |

---

## 3. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│ Toique SaaS基盤（マルチテナント）                         │
│                                                         │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│ │LINE連携ハブ  │  │対話エンジン  │  │ファイル保管 │   │
│ │(Webhook)     │→ │(ステート管理)│  │ (画像/PDF)  │   │
│ └──────────────┘  └──────────────┘  └─────────────┘   │
│         ↑                ↑                              │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│ │フォーム       │  │入力データ    │  │通知/連携    │   │
│ │ビルダー       │  │ストア        │  │(Mail/API)   │   │
│ └──────────────┘  └──────────────┘  └─────────────┘   │
│         ↑                ↑                              │
│ ┌─────────────────────────────────────────────────┐   │
│ │ 管理画面（契約者向け）                           │   │
│ │ フォーム設計 / 問い合わせ一覧 / 検索 / 返信      │   │
│ └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
       ↑                    ↓                 ↓
 ┌──────────┐       ┌──────────────┐    ┌──────────┐
 │契約者    │       │LINEユーザー  │    │外部      │
 │(管理者)  │       │(エンドユーザ)│    │システム  │
 └──────────┘       └──────────────┘    └──────────┘
```

### 3.1 主要コンポーネント

| コンポーネント   | 責務                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| LINE連携ハブ     | Webhook受信、署名検証、イベントディスパッチ、LINE API呼び出し          |
| 対話エンジン     | フォーム進行状態管理、回答記録、次質問生成                             |
| ファイル保管     | LINE Content API から画像/動画/PDFを取得しオブジェクトストレージへ保存 |
| フォームビルダー | 契約者が質問フローをノーコードで設計するUI                             |
| 入力データストア | セッション（進行中）、Submission（完了問い合わせ）、添付メタ           |
| 通知/連携        | 新規問い合わせのメール通知、Webhook外部連携                            |
| 管理画面         | 契約者オペレーター向けの業務UI                                         |

---

## 4. 技術スタック

既存リポジトリ `genzouw/ptasuku` の技術選定に準拠。

### 4.1 Backend

| レイヤー      | 選定                           | 用途                             |
| ------------- | ------------------------------ | -------------------------------- |
| 言語          | TypeScript 5.x                 |                                  |
| Web Framework | Hono 4.x                       | APIサーバ、Webhookエンドポイント |
| ORM           | Drizzle ORM 0.45 + drizzle-kit | スキーマ定義・マイグレーション   |
| Driver        | postgres-js 3.x                | PostgreSQL接続                   |
| Auth          | better-auth 1.6                | 契約者管理者/オペレーターの認証  |
| テスト        | Vitest 4                       | ユニット・統合テスト             |
| Runtime       | Node.js (`@hono/node-server`)  | 開発は tsx watch                 |

### 4.2 Frontend

| レイヤー     | 選定                                             | 用途   |
| ------------ | ------------------------------------------------ | ------ |
| 言語         | TypeScript 5.x                                   |        |
| UI Framework | React 19                                         |        |
| Build        | Vite 6                                           |        |
| Routing      | React Router 7                                   |        |
| Styling      | Tailwind CSS 4                                   |        |
| Component    | @base-ui-components/react                        | 基本UI |
| Icon         | lucide-react                                     |        |
| Utility      | class-variance-authority / clsx / tailwind-merge |        |

### 4.3 Infra

| 項目                   | 選定                                              |
| ---------------------- | ------------------------------------------------- |
| Database               | PostgreSQL 17                                     |
| 開発環境               | Docker Compose                                    |
| 本番Hosting            | 未決定（候補: Vercel / Fly.io / Cloud Run / ECS） |
| オブジェクトストレージ | Cloudflare R2（推奨）または AWS S3                |
| 秘密情報               | pgcrypto（最低限）または KMS                      |

---

## 5. データモデル（Drizzle スキーマ追加分）

既存 `schools`（テナント）、`users`、`sessions`、`accounts`、`verifications` は流用。以下のテーブルを追加。

### 5.1 `line_channels` — LINE公式アカウント登録

| カラム               | 型                | 説明               |
| -------------------- | ----------------- | ------------------ |
| id                   | uuid (PK)         |                    |
| school_id            | uuid (FK schools) | テナントID         |
| channel_id           | text UNIQUE       | LINE側のChannel ID |
| channel_secret       | text              | 暗号化して保存     |
| channel_access_token | text              | 暗号化して保存     |
| bot_basic_id         | text              | @xxxxx             |
| display_name         | text              |                    |
| is_active            | boolean           |                    |
| created_at           | timestamptz       |                    |

### 5.2 `forms` — フォーム定義

| カラム                  | 型                      | 説明                         |
| ----------------------- | ----------------------- | ---------------------------- |
| id                      | uuid (PK)               |                              |
| school_id               | uuid (FK schools)       |                              |
| line_channel_id         | uuid (FK line_channels) | どのチャネル用か             |
| name                    | text                    | 契約者向け識別名             |
| status                  | text                    | draft / published / archived |
| trigger_keyword         | text                    | 「査定」等で起動             |
| schema                  | jsonb                   | 質問フロー定義（JSON）       |
| version                 | integer                 |                              |
| created_at / updated_at | timestamptz             |                              |

### 5.3 `line_users` — LINEユーザー（問い合わせ者）

| カラム                      | 型          | 説明                    |
| --------------------------- | ----------- | ----------------------- |
| id                          | uuid (PK)   |                         |
| line_channel_id             | uuid (FK)   |                         |
| line_user_id                | text        | LINE側ユーザーID (Uxxx) |
| display_name                | text        |                         |
| picture_url                 | text        |                         |
| language                    | text        |                         |
| followed_at / unfollowed_at | timestamptz |                         |

UNIQUE (line_channel_id, line_user_id)

### 5.4 `line_sessions` — 進行中フォームセッション

| カラム                               | 型              | 説明                                |
| ------------------------------------ | --------------- | ----------------------------------- |
| id                                   | uuid (PK)       |                                     |
| line_user_id                         | uuid (FK)       |                                     |
| form_id                              | uuid (FK forms) |                                     |
| current_step                         | text            | スキーマ内のstep ID                 |
| answers                              | jsonb           | 蓄積中の回答                        |
| status                               | text            | in_progress / completed / abandoned |
| started_at / updated_at / expires_at | timestamptz     |                                     |

UNIQUE (line_user_id, form_id)

### 5.5 `submissions` — 確定問い合わせデータ

| カラム       | 型              | 説明                   |
| ------------ | --------------- | ---------------------- |
| id           | uuid (PK)       |                        |
| school_id    | uuid (FK)       |                        |
| form_id      | uuid (FK)       |                        |
| line_user_id | uuid (FK)       |                        |
| answers      | jsonb           | 回答のスナップショット |
| status       | text            | new / in_review / done |
| assignee_id  | uuid (FK users) | 担当オペレーター       |
| submitted_at | timestamptz     |                        |

### 5.6 `attachments` — 添付ファイル

| カラム              | 型          | 説明            |
| ------------------- | ----------- | --------------- |
| id                  | uuid (PK)   |                 |
| submission_id       | uuid (FK)   |                 |
| session_id          | uuid (FK)   |                 |
| storage_key         | text        | R2/S3 のキー    |
| content_type        | text        |                 |
| size_bytes          | integer     |                 |
| original_message_id | text        | LINE側messageId |
| created_at          | timestamptz |                 |

### 5.7 既存 `audit_logs` テーブル流用

操作履歴は既存の `audit_logs` パターンを流用（`action = 'submission_status_changed'` 等）。

---

## 6. ディレクトリ構成（backend）

既存 `ptasuku` の構成に準拠。

```
backend/src/
  index.ts                    ← ルーティング追加
  schema.ts                   ← §5 のテーブル追記
  db.ts                       ← 既存
  auth/                       ← 既存（better-auth）
  middleware/
    auth.ts                   ← 既存
    line-signature.ts         ← [新規] Webhook署名検証
  lib/
    audit.ts                  ← 既存
    line/
      client.ts               ← [新規] テナント別LINE APIクライアント
      signature.ts            ← [新規] HMAC検証関数
      messages.ts             ← [新規] Flex/QuickReplyビルダー
      content.ts              ← [新規] 画像・ファイル取得
      event-handler.ts        ← [新規] イベントディスパッチ
      types.ts                ← [新規] Webhookイベント型
    forms/
      engine.ts               ← [新規] 進行エンジン
      session.ts              ← [新規] セッション管理
      schema-zod.ts           ← [新規] フォームスキーマZod定義
    storage/
      index.ts                ← [新規] S3/R2 抽象化
    queue/
      enqueue.ts              ← [新規] 非同期処理投入
  routes/
    webhooks/
      line.ts                 ← [新規] POST /webhooks/line/:channelId
    line-channels.ts          ← [新規] 管理API
    forms.ts                  ← [新規] フォーム管理API
    submissions.ts            ← [新規] 問い合わせ一覧・詳細API
    attachments.ts            ← [新規] 署名付きURL発行
```

---

## 7. MVP スコープ（標準MVP）

以下を MVP に含める。

### 7.1 MVP必須機能

1. LINE公式アカウント接続（1契約者1チャネル）
2. ノーコードフォームビルダー（基本質問タイプ）
3. 画像/ファイルアップロード
4. 回答セッション管理（途中再開）
5. 問い合わせ一覧・詳細・検索
6. CSVエクスポート
7. マルチテナント / 契約者アカウント管理
8. メール通知（新規問い合わせ）
9. 条件分岐（質問の出し分け）
10. オペレーターロール / 権限
11. オペレーターからの手動返信
12. 業種別フォームテンプレート集
13. 課金・サブスク決済（Stripe等）

### 7.2 MVP後回し（Phase 2以降）

- Webhook（外部連携）
- Slack / Teams 通知
- API 公開（契約者向け）
- CRM 個別連携（kintone / Salesforce 等）
- 複数LINEチャネル接続（1契約者 N チャネル）
- 多言語対応
- 自動返信 / AI応答

---

## 8. LINE連携 詳細設計

### 8.1 Webhook受信フロー

```
LINEプラットフォーム
    ↓ POST /webhooks/line/:channelId
    ↓ Header: X-Line-Signature
    ↓ Body: {"destination": "...", "events": [...]}
┌─────────────────────────────────────────┐
│ Hono                                    │
│ 1. rawBody取得 (JSON parse前)           │
│ 2. lineSignature middleware             │
│    - channelId から line_channels 取得  │
│    - Channel Secret で HMAC-SHA256      │
│    - timingSafeEqual で検証             │
│ 3. 200 OK 即座返却                      │
│ 4. queueMicrotask で非同期処理起動      │
│ 5. events[] を event-handler に渡す     │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ event-handler                           │
│ - follow   → 挨拶メッセージ送信         │
│ - unfollow → line_users.unfollowed_at   │
│ - message (text) → forms engine 呼出    │
│ - message (image) → Content API取得     │
│                     → R2保存            │
│                     → forms engine 呼出 │
│ - postback → forms engine 呼出          │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│ forms engine                            │
│ 1. (lineUserId, formId) でセッション取得│
│ 2. 現step に入力を回答として記録        │
│ 3. バリデーション                       │
│ 4. 次step を算出                        │
│ 5. Flex/QuickReply を生成               │
│ 6. LINE Reply API または Push API で返信│
│ 7. 最終stepなら submissions へ確定      │
│    + 契約者へメール通知                 │
└─────────────────────────────────────────┘
```

### 8.2 署名検証（核心コード）

```ts
// middleware/line-signature.ts
export const lineSignature: MiddlewareHandler = async (c, next) => {
  const channelId = c.req.param('channelId');
  const signature = c.req.header('x-line-signature');
  if (!channelId || !signature) return c.text('Bad Request', 400);

  const rawBody = await c.req.text();

  const [channel] = await db
    .select()
    .from(lineChannels)
    .where(eq(lineChannels.channelId, channelId))
    .limit(1);
  if (!channel?.isActive) return c.text('Unknown channel', 404);

  const expected = createHmac('sha256', channel.channelSecret)
    .update(rawBody)
    .digest('base64');
  const ok =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return c.text('Invalid signature', 401);

  c.set('lineChannel', channel);
  c.set('rawBody', rawBody);
  await next();
};
```

### 8.3 3秒ルール対策

LINE Webhook は 3秒以内に 2xx を返さないと再送される。

**MVP方針**:

```ts
app.post('/:channelId', lineSignature, async (c) => {
  const rawBody = c.get('rawBody') as string;
  const { events } = JSON.parse(rawBody);
  queueMicrotask(() => processEvents(events, c.get('lineChannel')));
  return c.json({ ok: true });
});
```

**スケール時**: BullMQ (Redis) または Cloud Tasks / SQS に置換。

### 8.4 Reply Token / Push API の使い分け

- **Reply API** を優先（無料、1分以内、1回限り）
- 1分超 or 重処理後は **Push API** に fallback
- 画像解析で時間がかかる場合は Push API

### 8.5 フォームスキーマ定義（例）

```json
{
  "startStep": "intake_category",
  "steps": {
    "intake_category": {
      "type": "choice",
      "prompt": "査定希望のカテゴリを選んでください",
      "choices": [
        { "label": "時計", "value": "watch", "next": "brand" },
        { "label": "バッグ", "value": "bag", "next": "brand" }
      ]
    },
    "brand": {
      "type": "text",
      "field": "brand",
      "prompt": "ブランド名を教えてください",
      "next": "image_full"
    },
    "image_full": {
      "type": "image",
      "field": "image_full",
      "prompt": "商品の全体写真を送ってください",
      "next": "customer_name"
    },
    "customer_name": {
      "type": "text",
      "field": "customer_name",
      "prompt": "お名前をフルネームで教えてください",
      "validate": { "minLength": 2 },
      "next": "complete"
    },
    "complete": {
      "type": "end",
      "thanks": "お問い合わせありがとうございます。担当者よりご連絡いたします。"
    }
  }
}
```

質問タイプ: `choice / text / image / file / date / email / tel / address / consent / end`

### 8.6 画像・ファイル保管

1. 画像メッセージ受信 → `messageId` 取得
2. `GET https://api-data.line.me/v2/bot/message/{messageId}/content` (Channel Access Token)
3. バイナリを R2（または S3）に PUT
4. `attachments` レコード作成（`storage_key` 記録）
5. Submission確定時に `submission_id` を紐付け
6. 管理画面では 15分期限の **署名付きURL** で配信

### 8.7 契約者オンボーディング（LINEチャネル登録フロー）

管理画面での設定手順:

1. 契約者が LINE Developers で Messaging API チャネル作成
2. Toique管理画面に以下を入力
   - Channel ID
   - Channel Secret
   - Channel Access Token（長期）
3. Toique が払い出す Webhook URL (`https://api.toiq.example/webhooks/line/{channelId}`) を契約者が LINE Developers に貼付
4. LINE Developers 側で「応答メッセージ: オフ」「Webhook: オン」に設定
5. Toique 管理画面で接続テスト（`/v2/bot/info` で 200 確認）
6. `line_channels.is_active = true`

UX配慮: 手順書（動画・スクショ付き）を管理画面に埋め込む。

---

## 9. マルチテナント設計

### 9.1 分離戦略

- **共有DB + school_id カラムで論理分離**（既存ptasuku方針に準拠）
- 全クエリで `school_id` 条件を強制
- Middleware レベルで認可（既存 `middleware/auth.ts` パターン）

### 9.2 秘密情報の扱い

`line_channels.channel_secret` / `channel_access_token` は、

- **MVP**: pgcrypto の `pgp_sym_encrypt` で DB暗号化（鍵は環境変数）
- **エンタープライズ**: AWS KMS / GCP KMS で envelope encryption

### 9.3 LINE User ID の個人情報性

LINE User ID は個人を識別し得る情報（特定個人と紐付く）。個人情報として扱い、保存時の暗号化・削除要求対応を設計する。

### 9.4 データ保持ポリシー

- 問い合わせデータ: 契約者ごと保持期間設定可（デフォルト3年）
- 添付ファイル: 同上
- 削除要求: LINE User ID 単位で全データ物理削除 API を提供（`audit_logs` には残す）

---

## 10. 管理画面（React）

### 10.1 主要ページ

| ページ           | 内容                                                    |
| ---------------- | ------------------------------------------------------- |
| ダッシュボード   | 本日の受信件数、未対応件数、平均応答時間                |
| LINEチャネル管理 | 追加・編集・接続テスト・手順書                          |
| フォーム一覧     | 契約者のフォーム一覧                                    |
| フォームビルダー | ドラッグ&ドロップで質問フロー設計、条件分岐、プレビュー |
| 問い合わせ一覧   | ステータス別、検索、絞込                                |
| 問い合わせ詳細   | 回答内容、添付画像確認、ステータス変更、手動返信        |
| オペレーター管理 | ロール・権限                                            |
| 請求             | プラン、利用量、Stripe連携                              |

### 10.2 既存パターン活用

`ptasuku/frontend/src/pages/` の構造を流用。`@base-ui-components/react` + Tailwind 4 で統一。

---

## 11. セキュリティ要件

| 項目         | 対応                                    |
| ------------ | --------------------------------------- |
| テナント分離 | 全クエリで school_id 強制               |
| 署名検証     | Webhook で timingSafeEqual              |
| 秘密情報     | pgcrypto / KMS で暗号化                 |
| 認証         | better-auth（既存）                     |
| 認可         | ミドルウェアで role チェック            |
| 監査ログ     | audit_logs テーブル（既存流用）         |
| 個人情報     | LINE User ID を含む情報は暗号化保存     |
| 削除要求     | 物理削除API提供                         |
| 通信         | HTTPS必須、HSTS有効                     |
| レート制限   | Webhook以外のAPIにIP/ユーザー単位の制限 |

---

## 12. 技術的議論ポイント（要決定）

| #   | 論点             | 選択肢                                    | 推奨                                    |
| --- | ---------------- | ----------------------------------------- | --------------------------------------- |
| 1   | LINE SDK         | `@line/bot-sdk` / 自前 fetch+Zod          | 自前 fetch+Zod                          |
| 2   | ストレージ       | S3 / R2 / GCS                             | Cloudflare R2                           |
| 3   | 非同期処理       | queueMicrotask / BullMQ / Cloud Tasks     | MVP: queueMicrotask、スケール: BullMQ   |
| 4   | 秘密情報暗号化   | 平文 / pgcrypto / KMS                     | MVP: pgcrypto、本番: KMS                |
| 5   | Webhook識別      | パス `:channelId` / payload `destination` | パス方式                                |
| 6   | 返信方法         | Reply API / Push API                      | Reply優先、タイムアウト時 Push          |
| 7   | セッションTTL    | 24h / 72h / 7日                           | 72時間                                  |
| 8   | 本番ホスティング | Vercel / Fly.io / Cloud Run / ECS         | 要議論（Webhookのコールドスタート懸念） |
| 9   | 課金モデル       | 固定 / 従量 / ハイブリッド                | ハイブリッド（基本料＋件数）            |

---

## 13. ロードマップ（ドラフト）

| フェーズ              | ゴール                              | 主要成果物                                             |
| --------------------- | ----------------------------------- | ------------------------------------------------------ |
| **Phase 0: 設計確定** | 仕様凍結・PoC                       | 本ドキュメントの承認、課金モデル決定、ホスティング決定 |
| **Phase 1: 基盤構築** | LINE Webhook + フォームエンジン動作 | スキーマ、Webhook、対話エンジン、1フォーム通しで動作   |
| **Phase 2: 管理画面** | 契約者がフォーム作成・閲覧可能      | フォームビルダー、問い合わせ一覧、詳細                 |
| **Phase 3: MVP完成**  | 課金含む販売可能状態                | Stripe、テンプレート集、通知、オペレーター管理         |
| **Phase 4: β提供**    | 最初の契約者で本番運用              | 導入支援、サポート、安定化                             |
| **Phase 5: 拡張**     | Phase2機能追加                      | Webhook外部連携、API、CRM連携                          |

---

## 14. 打合せで確認したい事項

1. 初期ターゲット契約者像（具体企業の有無）
2. 課金モデル詳細（価格レンジ、無料枠有無）
3. 本番ホスティング方針（コスト vs 運用性）
4. データ保持ポリシー（業種別の法令要件）
5. ブランド方針（サービス名最終決定）
6. 開発体制・スケジュール
7. 競合比較（Lステップ、チャネルトーク等との差別化再整理）

---

## 15. 用語集

| 用語                 | 説明                                                         |
| -------------------- | ------------------------------------------------------------ |
| テナント             | 契約企業1社＝1テナント                                       |
| LINE公式アカウント   | 契約企業が LINE Developers で作成する Messaging API チャネル |
| Channel Secret       | Webhook署名検証用の共有秘密                                  |
| Channel Access Token | LINE Messaging API呼び出し用の長期トークン                   |
| Reply Token          | メッセージ受信時に発行される、1分間・1回限りの返信トークン   |
| Flex Message         | 画像＋ボタン等のリッチなLINEメッセージ形式                   |
| QuickReply           | 選択肢をボタンで表示するLINE UI要素                          |
| Submission           | フォーム完了後の確定問い合わせデータ                         |
| Session              | フォーム回答中の一時的進行状態                               |
