# 手動デプロイ手順

`.github/workflows/deploy.yml` を GitHub Actions 上で実行できない場合 (billing 問題・workflow disabled 等) に、ローカルマシンから同等のデプロイを再現するための手順。

CI を経由しないため、対応するチェックや承認フローがスキップされる点に注意。実行前にローカルで `bun --cwd backend run test` `bun --cwd frontend run test` 等が緑であることを確認すること。

## 前提条件

### 必要なツール

- `gcloud` CLI (`gcloud components install`)
- `docker` (Docker Desktop もしくは互換ランタイム)
- `bun` (1.3.14 推奨。`.github/workflows/deploy.yml` の `setup-bun` と同じバージョン)

### 認証セットアップ (初回 or 期限切れ時のみ)

```bash
# GCP (個人アカウント or 適切な権限を持つアカウント)
gcloud auth login
gcloud auth application-default login
gcloud config set project <GCP_PROJECT_ID>

# Artifact Registry への Docker push を許可
gcloud auth configure-docker asia-northeast1-docker.pkg.dev --quiet

# Cloudflare API トークン (フロントデプロイ用)
# https://dash.cloudflare.com/profile/api-tokens で Pages:Edit 権限のトークンを発行
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
```

### 必要な権限

ローカル実行アカウント (個人アカウント or impersonate する SA) に以下の権限が必要:

- `roles/run.admin` (Cloud Run サービス / ジョブのデプロイ)
- `roles/artifactregistry.writer` (Docker image push)
- `roles/secretmanager.secretAccessor` (Secret Manager から DATABASE_URL を取得)
- `roles/iam.serviceAccountUser` (Cloud Run の SA を起動するため)

CI 用 SA (`github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com`) を impersonate するなら、各 gcloud コマンドに `--impersonate-service-account=github-deployer@<GCP_PROJECT_ID>.iam.gserviceaccount.com` を付与する。

## 共通変数

リポジトリルートで実行する想定:

```bash
cd /path/to/toique
export GCP_PROJECT_ID=<GCP_PROJECT_ID>
export GCP_REGION=asia-northeast1
export ARTIFACT_REPO=toique
export CLOUD_RUN_SERVICE=toique-backend
export SHA=$(git rev-parse HEAD)
echo "Deploying SHA=$SHA"
```

## ① Backend: Docker build → push → Cloud Run デプロイ

### 1. backend image build & push

`backend/Dockerfile` の `production` ステージをビルドして Artifact Registry に push する。

```bash
export BACKEND_IMAGE=$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$ARTIFACT_REPO/backend:$SHA

docker buildx build \
  --platform linux/amd64 \
  --file backend/Dockerfile \
  --target production \
  --tag "$BACKEND_IMAGE" \
  --push \
  --provenance=false \
  .
```

> ⚠️ Cloud Run は linux/amd64 が必須。Apple Silicon でビルドするので `--platform linux/amd64` は必須。

### 2. DB マイグレーション

Secret Manager から `DATABASE_URL` を取得し、`drizzle-kit migrate` を実行する。

```bash
export DATABASE_URL="$(gcloud secrets versions access latest --secret=DATABASE_URL --project=$GCP_PROJECT_ID)"

(cd backend && bun install --frozen-lockfile && bunx drizzle-kit migrate)

unset DATABASE_URL
```

心配なら `bunx drizzle-kit check` で整合性チェックしてから `migrate` するのが安全。

### 3. Cloud Run へデプロイ

環境変数にカンマを含む値 (`CORS_ORIGIN`) があるため、`--env-vars-file` (YAML) を使うのが安全。

```bash
cat > /tmp/cloud-run-env.yaml <<'EOF'
NODE_ENV: "production"
CORS_ORIGIN: "https://toique.genzouw.com,https://toique.pages.dev"
STRIPE_PRO_PRICE_ID: "<STRIPE_PRO_PRICE_ID>"
MAIL_DRIVER: "resend"
MAIL_FROM: "Toique <MAIL_FROM_ADDRESS>"
CONTACT_FROM: "Toique <MAIL_FROM_ADDRESS>"
OPERATOR_EMAILS: "<OPERATOR_EMAIL>"
ADMIN_USERNAME: "admin"
EOF

gcloud run deploy "$CLOUD_RUN_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --image="$BACKEND_IMAGE" \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --cpu=1 \
  --memory=512Mi \
  --allow-unauthenticated \
  --port=8080 \
  --env-vars-file=/tmp/cloud-run-env.yaml \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,BETTER_AUTH_SECRET=BETTER_AUTH_SECRET:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=STRIPE_WEBHOOK_SECRET:latest,RESEND_API_KEY=RESEND_API_KEY:latest,ADMIN_PASSWORD=ADMIN_PASSWORD:latest"

rm /tmp/cloud-run-env.yaml
```

### 4. BETTER_AUTH_URL を更新

デプロイ後の Cloud Run URL を取得して `BETTER_AUTH_URL` 環境変数を更新する。

```bash
SERVICE_URL=$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format="value(status.url)")
echo "Backend URL: $SERVICE_URL"

gcloud run services update "$CLOUD_RUN_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --update-env-vars "BETTER_AUTH_URL=$SERVICE_URL"
```

## ② Backup Job のデプロイ

`backup/Dockerfile` をビルドして Cloud Run Job (`db-backup`) を更新する。

```bash
export BACKUP_IMAGE=$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$ARTIFACT_REPO/backup:$SHA

docker buildx build \
  --platform linux/amd64 \
  --file backup/Dockerfile \
  --tag "$BACKUP_IMAGE" \
  --push \
  --provenance=false \
  ./backup

gcloud run jobs deploy db-backup \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID" \
  --image="$BACKUP_IMAGE"
```

## ③ Frontend: build → Cloudflare Pages デプロイ

### 1. Backend の SERVICE_URL を再取得

`VITE_API_URL` に渡すため、最新の Cloud Run URL を取得する (① で取得済みなら省略可)。

```bash
SERVICE_URL=$(gcloud run services describe "$CLOUD_RUN_SERVICE" \
  --region="$GCP_REGION" --project="$GCP_PROJECT_ID" --format="value(status.url)")
```

### 2. build

```bash
(cd frontend && \
  bun install --frozen-lockfile && \
  VITE_API_URL="$SERVICE_URL" VITE_GA_TRACKING_ID="${VITE_GA_TRACKING_ID:-}" bun run build)
```

`VITE_GA_TRACKING_ID` は GA トラッキング ID。CI では `vars.VITE_GA_TRACKING_ID` から取っている。必要なら手元の値を `export VITE_GA_TRACKING_ID=...` で渡す (不要なら空でも build は通る)。

### 3. Cloudflare Pages にデプロイ

```bash
(cd frontend && \
  bunx wrangler pages deploy dist \
    --project-name=toique \
    --commit-dirty=true \
    --commit-hash="$SHA" \
    --commit-message="Manual deploy $SHA")
```

## 実行順序の推奨

```
① backend デプロイ
  ↓ (SERVICE_URL を得る)
② backup ジョブデプロイ (① と並行実行可、SERVICE_URL に依存しない)
③ frontend デプロイ (① の SERVICE_URL に依存)
```

backend を最初にデプロイし、`SERVICE_URL` を取得してから frontend を build するのが CI と同じフロー。

## ロールバック

backend が壊れた場合、即時切り戻しは以下:

```bash
# 直近のリビジョン一覧
gcloud run revisions list \
  --service="$CLOUD_RUN_SERVICE" \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"

# 100% トラフィックを旧リビジョンへ戻す
gcloud run services update-traffic "$CLOUD_RUN_SERVICE" \
  --to-revisions=<旧リビジョン名>=100 \
  --region="$GCP_REGION" \
  --project="$GCP_PROJECT_ID"
```

frontend は Cloudflare Pages の「Deployments」画面から「Rollback」ボタンで戻せる (CLI からも `wrangler pages deployment` 経由で可能)。

## トラブルシューティング

| 症状                                                                   | 確認ポイント                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `denied: Permission ... artifactregistry.repositories.uploadArtifacts` | `gcloud auth configure-docker` を実行済みか / SA に `roles/artifactregistry.writer` があるか |
| `exec format error` (Cloud Run 起動失敗)                               | `docker buildx build` に `--platform linux/amd64` を渡したか                                 |
| `Secret Manager` 404                                                   | `gcloud secrets list --project=<GCP_PROJECT_ID>` で対象シークレットが存在するか確認           |
| `drizzle-kit: command not found`                                       | `cd backend && bun install` で devDependencies が入っているか                                |
| Cloudflare Pages デプロイ後に CSP 違反                                 | `frontend/public/_headers` の `connect-src` に新 backend URL を含むか確認                    |

## 参考

- `.github/workflows/deploy.yml` — 本ドキュメントの元になる CI 定義
- `backend/Dockerfile` — production ステージのビルド構成
- `frontend/Dockerfile` — フロントは Cloudflare Pages 配信のため CI/local 専用
- `docs/csp-inventory.md` — CSP 設定とデプロイ後の確認手順
