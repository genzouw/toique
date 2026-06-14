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

**Phase 2b (管理画面・最小) 実装完了**

- ダッシュボード（登録チャネル数・受信メッセージ数）
- LINEチャネル管理（登録/一覧/削除）
- 受信メッセージ一覧（受信時刻・種別・テキスト）

**Phase 2a (認証 + マルチテナント) 実装完了**

- Email + Password 認証 (better-auth)
- テナント単位のデータ分離 (line_channels / messages は tenant_id で絞り込み)
- サインアップ → Onboarding (組織名入力) → 管理画面 のフロー
- 未認証は `/login` へ、テナント未登録は `/onboarding` へ自動リダイレクト

**Phase 3 (フォームエンジン) 実装完了**

- JSONスキーマ駆動の対話型フォーム (choice / text / end)
- trigger キーワード で起動、LINE Quick Reply で選択肢表示
- セッション進行・完了で submission 自動記録
- 管理画面: フォーム一覧・作成・編集 (JSONエディタ) / 問い合わせ一覧

## フォーム動作確認例

チャネル登録 + フォーム公開後、LINE から trigger キーワード (例: `査定`) を送ると:

1. カテゴリ選択 (Quick Reply) → ユーザーがタップ
2. ブランド名入力 → ユーザーがテキスト送信
3. 完了メッセージ + 管理画面の「問い合わせ」に記録

フォームスキーマの例は `frontend/src/pages/FormEdit.tsx` の `DEFAULT_SCHEMA` を参照。

## 管理画面

`docker compose up -d` 後、http://localhost:5173 でアクセスできます。

初回は `/signup` から登録 → 組織名入力 → ダッシュボードへ遷移します。

## 開発環境

### 必要なもの

- Docker / Docker Compose
- Bun 1.0+
- ngrok（LINE Webhook をローカルに公開する場合）

### ポート設定

ホストマシン側で他のローカルサービスと衝突しないよう、以下のポートを使用しています:

| サービス | ホスト側 | コンテナ側 |
| -------- | -------- | ---------- |
| frontend | 5173     | 5173       |
| backend  | 3000     | 3000       |
| postgres | 5433     | 5432       |

> postgres はローカルインストール版と衝突回避のため 5433 にしています。

### 初回セットアップ

```bash
# DBコンテナを起動
docker compose up -d db

# 依存パッケージインストール
cd backend && bun install

# DBマイグレーション適用
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique bun run db:migrate
```

### 開発サーバ起動

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique bun run dev
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
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique bun run db:generate
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique bun run db:migrate
```

### テスト

```bash
cd backend
DATABASE_URL=postgresql://toique:toique@localhost:5433/toique bun run test
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

## SEO TODO

- `frontend/public/ogp.png` は未配置。現状は暫定で `ogp.svg`（1200×630）をコミットしているが、主要SNS（X/Facebook/LINE）はSVGを解釈しないため、PNGに差し替える必要あり。Figma等で作成した1200×630 PNGを同ファイル名で配置すれば `index.html` の `og:image` / `twitter:image` がそのまま機能する。

## ロードマップ

将来計画は [`docs/ROADMAP.md`](docs/ROADMAP.md) を参照。

## 品質・セキュリティの仕組み

### CI / CD

| Workflow           | 目的                                                                           |
| ------------------ | ------------------------------------------------------------------------------ |
| `ci.yml`           | frontend / backend の lint / typecheck / format / test / build (Docker ベース) |
| `deploy.yml`       | Cloud Run / Cloudflare Pages へのデプロイ                                      |
| `restore-test.yml` | DB バックアップの月次復旧検証                                                  |

### 静的解析・セキュリティスキャン

| Workflow           | 目的                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------- |
| `codeql.yml`       | GitHub CodeQL (JS/TS) による静的解析。push / PR / 週次                                      |
| `trivy.yml`        | 依存関係 / IaC / Dockerfile / secret の脆弱性スキャン。SARIF を Security タブにアップロード |
| `gitleaks.yml`     | コミット履歴を含むシークレットスキャン                                                      |
| `actionlint.yml`   | GitHub Actions YAML の lint                                                                 |
| `markdownlint.yml` | Markdown の lint (`.markdownlint-cli2.jsonc`)                                               |
| `knip.yml`         | 未使用コード・未使用依存の検出                                                              |

### コードレビューとAI自動化

- **CodeRabbit** (`.coderabbit.yaml`): profile=assertive。本番自動デプロイ運用のため高感度
- **Gemini Code Assist** (`.gemini/config.yaml` + `.gemini/styleguide.md`): 日本語レビュー
- **Qodo Merge (PR Agent)**: CodiumAI を使用したPR自動レビュー。公開リポジトリは完全無料で使用できます（※ GitHub Appとしてのインストール推奨、または Actions経由での実行）。
- **AI Issue Triage** (`ai-issue-triage.yml`): `actions/github-script` を用いて、Issueが作成された際に自動で GitHub Models を呼び出し、トリアージを行う仕組みです。
- **AI ChatOps** (`ai-chatops.yml`): PRのコメントで `/ai fix` などのコマンドを受け取り、GitHub Models と Web検索 (RAG) を活用して自動で回答や修正案を提示します。
- **AI PR Code Review** (`ai-pr-review.yml`): PR作成時等に、コード差分とWeb検索から得たベストプラクティスに基づき、GitHub Modelsが自動レビューを行います。

> [!NOTE]
> **導入のための手動事前作業:**
>
> 1. **Qodo Merge**: [Qodo Merge GitHub App](https://github.com/apps/qodo-merge) をインストールするだけで公開リポジトリに対して完全無料で利用可能です。自動的に `.pr_agent.toml` の設定を読み込みます。
> 2. **GitHub Models連携**: AI Issue Triage, AI Weekly Summary, AI Release Drafter, AI ChatOps, AI PR Code Review はすべて GitHub Models を使用します。手動での API キー登録は不要で、自動的に `GITHUB_TOKEN` が利用されます。
> 3. **権限設定**: 各ワークフローファイルに `permissions:` が個別定義されているため、リポジトリ全体の "Workflow permissions" を **Read and write** にする必要はありません。デフォルトの **Read repository contents and packages permissions** のままで動作します（各ワークフローは `issues: write` や `pull-requests: write` などの必要な権限を内部で個別に宣言しています）。

### PR / リポジトリ運用

| 仕組み                     | 説明                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PULL_REQUEST_TEMPLATE.md` | PR 説明の標準テンプレート                                                                                                                         |
| `stale.yml`                | 最終更新から 14 日で `stale`、最終更新から 16 日で自動クローズ（= stale 付与から約 2 日後）。`WIP` / `do-not-close` / `dependencies` ラベルは除外 |
| `pr_conflict_notify.yml`   | main push 時 / 日次で全 open PR のコンフリクト検出 → author へ通知                                                                                |
| `dependabot.yml`           | npm / github-actions / docker を日次でグループ化 PR                                                                                               |
| `CODEOWNERS`               | レビュー自動アサイン                                                                                                                              |

### ローカル開発時の品質ゲート

- **Husky** (`.husky/pre-commit`): lint-staged → 変更が backend / frontend に及ぶ場合は typecheck + test も実行
- **lint-staged** (ルート `package.json`): backend / frontend それぞれ ESLint --fix + Prettier

### シークレット漏洩防止

当プロジェクトは公開リポジトリであるため、誤ってシークレットをコミットしないよう以下の仕組みを導入しています。
詳しくは [`docs/security/leak-prevention.md`](docs/security/leak-prevention.md) を参照してください。

- **Pre-commit フック (`secretlint`, `gitleaks`)**: 開発者のローカル環境でコミット前にシークレットを検知します（`gitleaks` はローカルにインストールされている場合のみ実行され、検出時はコミットをブロック。未インストール時は警告のみでスキップし、CI 側の検知に委ねます）。
- **CI / GitHub Actions**: `gitleaks` および `trivy` を使用して PR および push 時に二重チェックを行います。

### セキュリティ報告窓口

脆弱性やシークレット漏洩を発見した場合は、公開のIssue等で報告せず、速やかにプライベートな窓口（[`SECURITY.md`](SECURITY.md) 参照）へご報告ください。
