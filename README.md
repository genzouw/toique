# Toique（トイク）

> LINE問い合わせ受付 SaaS

LINE公式アカウントを接続し、対話型フォームで問い合わせを受け付け、構造化データとして管理画面で確認できる SaaS。

## ドキュメント

- [設計書（2026-04-16）](docs/superpowers/specs/2026-04-16-toique-line-inquiry-saas-design.md)
- [Phase 1 実装計画](docs/superpowers/plans/2026-04-16-line-foundation-implementation.md)

## ステータス

**Phase 1 (LINE連携基盤) 実装完了**

- LINE Webhook 受信 + 署名検証
- メッセージ受信ログ
- テキストメッセージへのオウム返し応答
- LINEチャネル登録/一覧/削除 API
- 受信メッセージ一覧 API

## 開発環境

### 必要なもの

- Docker / Docker Compose
- Node.js 22+ （ローカルで `npm run dev` を使う場合）
- ngrok（LINE Webhook をローカルに公開する場合）

### ポート設定

ホストマシン側で他のローカルサービスと衝突しないよう、以下のポートを使用しています:

| サービス | ホスト側 | コンテナ側 |
| -------- | -------- | ---------- |
| backend  | 3000     | 3000       |
| postgres | 5433     | 5432       |

> postgres はローカルインストール版と衝突回避のため 5433 にしています。

### 初回セットアップ

```bash
# DBコンテナを起動
docker compose up -d db

# 依存パッケージインストール
cd backend && npm install

# DBマイグレーション適用
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique npm run db:migrate
```

### 開発サーバ起動

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique npm run dev
```

サーバが `http://localhost:3000` で起動します。

### Docker Compose 全部起動 (DB + backend)

```bash
docker compose up -d
docker compose logs -f backend
docker compose down       # 停止
docker compose down -v    # 停止 + DBデータ削除
```

### マイグレーション

スキーマ変更後:

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique npm run db:generate
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique npm run db:migrate
```

### テスト

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique npm test
```

DBを使うテストがあるため、事前に `docker compose up -d db` が必要です。

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
- 以下で受信内容を確認できる:

```bash
curl -s http://localhost:3000/api/v1/messages | jq
```

### トラブルシュート

- **Verify が Failed**: ngrok URL が `https` であること、Webhook URL のパスが `/webhooks/line/<Channel ID>` (Channel **ID**であって Bot Basic ID ではない) であることを確認
- **オウム返しが返らない**: backend のログに `[line-webhook] event handling failed` が出ていないか確認。Channel access token が正しいか再確認
- **404 Not Found**: backend が `3000` で起動しているか確認

## API リファレンス (Phase 1)

| Method | Path                        | 説明                                            |
| ------ | --------------------------- | ----------------------------------------------- |
| GET    | `/health`                   | DB接続を含むヘルスチェック                      |
| POST   | `/webhooks/line/:channelId` | LINE Webhook (LINEプラットフォームから呼ばれる) |
| GET    | `/api/v1/line-channels`     | LINE チャネル一覧                               |
| POST   | `/api/v1/line-channels`     | LINE チャネル登録                               |
| DELETE | `/api/v1/line-channels/:id` | LINE チャネル削除                               |
| GET    | `/api/v1/messages`          | 受信メッセージ一覧 (新しい順、最大100件)        |

## 技術スタック

- Backend: Hono 4 + Drizzle ORM + PostgreSQL 17 + (Phase 2: better-auth)
- Frontend: (Phase 2 で追加) React 19 + Vite + Tailwind 4
- 参考リポジトリ: [genzouw/ptasuku](https://github.com/genzouw/ptasuku)

## Phase 1 の限界 (意図的に後回し)

以下は Phase 2 以降で対応:

- 認証・認可 (現在は管理 API は誰でも叩ける)
- LINE チャネルの secret/token の DB 暗号化
- フォームエンジン (現在はオウム返しのみ)
- 画像/ファイルダウンロード処理 (現在は受信ログのみ)
- フロントエンド管理画面
- マルチテナント (tenants テーブル)
