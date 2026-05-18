# フォーク後セットアップガイド

本リポジトリを fork して自分の環境で動かすために必要な設定をまとめる。本リポジトリは GCP (Cloud Run / Artifact Registry / Cloud Run Jobs / Cloud Scheduler / Secret Manager) と Cloudflare Pages、Stripe、Resend を利用する。

## 1. 必須 Repository Variables

`Settings → Secrets and variables → Actions → Variables` に以下を設定する。`.github/workflows/deploy.yml` および `restore-test.yml` の preflight validation が空文字を検知して fail fast する。

### インフラ系 (deploy.yml / restore-test.yml で必須)

| 名前                  | 用途                                                 | 例                                                        |
| --------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `GCP_PROJECT_ID`      | Cloud Run / Artifact Registry の GCP プロジェクト ID | `my-project-prod`                                         |
| `GCP_PROJECT_NUMBER`  | Workload Identity Federation の対象プロジェクト番号  | `123456789012`                                            |
| `GCP_SERVICE_ACCOUNT` | デプロイ用 SA の email                               | `github-deployer@my-project-prod.iam.gserviceaccount.com` |
| `GCP_REGION`          | Cloud Run / Artifact Registry のリージョン (任意)    | `asia-northeast1` (デフォルト)                            |

### アプリケーション値 (deploy-backend ジョブで必須)

| 名前                  | 用途                                            | 例                                             |
| --------------------- | ----------------------------------------------- | ---------------------------------------------- |
| `CORS_ORIGIN`         | バックエンド CORS 許可オリジン (カンマ区切り可) | `https://example.com,https://my-app.pages.dev` |
| `STRIPE_PRO_PRICE_ID` | Stripe Pro プラン価格 ID                        | `price_xxxxxxxxxxxx`                           |
| `MAIL_FROM`           | 認証メールの送信元                              | `App <noreply@example.com>`                    |
| `CONTACT_FROM`        | お問い合わせメールの送信元                      | `App <noreply@example.com>`                    |

`OPERATOR_EMAILS` と `ADMIN_USERNAME` は Secrets 側で管理する (個人情報・管理 UI 識別子のため。下記の Section 2 参照)。

### 任意 (フォールバック値あり)

| 名前                   | デフォルト                  |
| ---------------------- | --------------------------- |
| `CLOUD_RUN_SERVICE`    | `toique-backend`            |
| `ARTIFACT_REPO`        | `toique`                    |
| `CLOUD_RUN_JOB_BACKUP` | `db-backup`                 |
| `CF_PAGES_PROJECT`     | `toique`                    |
| `VITE_GA_TRACKING_ID`  | (空。GA タグを埋め込まない) |

### restore-test 用 (任意・上書き可)

| 名前         | デフォルト                     |
| ------------ | ------------------------------ |
| `GCS_BUCKET` | `${GCP_PROJECT_ID}-db-backups` |

## 2. Repository Secrets

`Settings → Secrets and variables → Actions → Secrets` に以下を設定する。

### 2-1. 必須 Secrets

| 名前                    | 用途                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare Pages デプロイ用 API トークン (`Pages:Edit` 権限) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID                                     |
| `OPERATOR_EMAILS`       | 運営者扱いするアカウントの email (カンマ区切り)              |
| `ADMIN_USERNAME`        | 管理 UI のベーシック認証ユーザー名                           |

### 2-2. 任意 Secrets

未設定でもデプロイは成立する。設定すると追加機能が有効化される。

| 名前                | 用途                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `DOGFOODING_EMAILS` | Stripe 課金なしで Pro 相当として扱う dogfooding 用 email (カンマ区切り)。未設定だと機能無効化 |

`OPERATOR_EMAILS` / `ADMIN_USERNAME` / `DOGFOODING_EMAILS` を Secrets として扱う理由:

- `OPERATOR_EMAILS`: 個人 Gmail アドレス等が含まれることが多く、CI ログ等への意図せぬ漏出リスクを最小化するため
- `ADMIN_USERNAME`: 管理 UI のベーシック認証情報の一部。攻撃面を狭めるため `ADMIN_PASSWORD` (Secret Manager) と対応する形で隠蔽
- `DOGFOODING_EMAILS`: 課金スキップを意味する email リスト。漏れると「この email を乗っ取れば Pro 機能が無料で使える」というシグナルになるため、攻撃標的化を避ける目的で Secrets で管理。未設定なら dogfooding 機能は無効化される (空集合扱い)

## 3. Google Cloud 側のセットアップ

### 3-1. プロジェクトと API の有効化

```bash
gcloud projects create $GCP_PROJECT_ID
gcloud config set project $GCP_PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

### 3-2. Artifact Registry リポジトリ作成

```bash
gcloud artifacts repositories create $ARTIFACT_REPO \
  --location=$GCP_REGION \
  --repository-format=docker
```

### 3-3. Workload Identity Federation + デプロイ用 SA (推奨: CDKTF 経由)

WIF Pool / Provider / `github-deployer` SA / SA への IAM 設定 / WIF→SA binding は `infra/main.ts` で IaC 化されている。詳細手順は `infra/README.md` を参照。

```bash
cd infra
bun install --frozen-lockfile
export GCP_PROJECT_ID=...
export GCP_PROJECT_NUMBER=...
export GITHUB_REPOSITORY=<owner>/<repo>
bunx cdktf deploy
```

`attribute_condition` は `assertion.repository == '<owner>/<repo>' && assertion.ref == 'refs/heads/main'` で厳格化済み。GitHub Actions は workflow ごとに OIDC token を常に発行するが、Google STS への token 交換時にこの条件で評価され、同オーナー他リポ・他ブランチ・PR・タグからの token は **GCP 側で拒否される** (= GCP 認証に失敗する)。

#### gcloud で手動構築する場合（CDKTF を使わない初回 quick start）

```bash
# 1. Pool
gcloud iam workload-identity-pools create github-pool \
  --location=global --display-name="GitHub Actions Pool"

# 2. Provider（厳格な attribute_condition）
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub Actions OIDC" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository == '<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>' && assertion.ref == 'refs/heads/main'"

# 3. デプロイ用 SA
gcloud iam service-accounts create github-deployer \
  --display-name="GitHub Actions Deployer"

DEPLOYER_SA="github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com"

# 4. SA への role 付与（PoLP: roles/iam.serviceAccountUser は Project-wide には付与しない）
for role in roles/run.admin \
            roles/artifactregistry.writer \
            roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
    --member="serviceAccount:$DEPLOYER_SA" --role="$role"
done

# 4-b. runtime SA への SA User 権限を個別 binding で付与
# Cloud Run service の runtime はデフォルト Compute SA
gcloud iam service-accounts add-iam-policy-binding \
  $GCP_PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --member="serviceAccount:$DEPLOYER_SA" \
  --role=roles/iam.serviceAccountUser
# db-backup Cloud Run Job の runtime は backup-job SA
gcloud iam service-accounts add-iam-policy-binding \
  backup-job@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --member="serviceAccount:$DEPLOYER_SA" \
  --role=roles/iam.serviceAccountUser

# 5. WIF → SA binding（principal:// subject で repo + main branch に限定する多層防御）
gcloud iam service-accounts add-iam-policy-binding $DEPLOYER_SA \
  --member="principal://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/subject/repo:<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>:ref:refs/heads/main" \
  --role="roles/iam.workloadIdentityUser"
```

手動構築した場合も後から CDKTF 管理下に取り込める。`infra/README.md` の「既存リソースの取り込み」節を参照。

### 3-5. Secret Manager (本番値)

`deploy.yml` 内の `--set-secrets` で参照されるシークレットを Secret Manager に作成する:

```bash
for secret in DATABASE_URL BETTER_AUTH_SECRET STRIPE_SECRET_KEY \
              STRIPE_WEBHOOK_SECRET RESEND_API_KEY ADMIN_PASSWORD; do
  echo -n "<VALUE>" | gcloud secrets create "$secret" --data-file=-
done
```

それぞれの値は本番運用で個別に発行する (DB URL、Better Auth セッション秘密鍵、Stripe 鍵、Resend API キー、管理ユーザーのパスワード)。

## 4. Cloudflare 側のセットアップ

1. Cloudflare Pages で新規プロジェクトを作成 (プロジェクト名は `CF_PAGES_PROJECT` Variables と一致させる)
2. `https://dash.cloudflare.com/profile/api-tokens` で `Pages:Edit` 権限のトークンを発行し、`CLOUDFLARE_API_TOKEN` Secrets に設定
3. アカウント ID を `CLOUDFLARE_ACCOUNT_ID` Secrets に設定
4. (任意) custom domain を Pages プロジェクトに紐付け、`frontend/public/_redirects` のコメントを参考に `*.pages.dev` → custom domain の 301 を設定 (SEO duplicate content 対策)

## 5. Stripe 側のセットアップ

1. Stripe ダッシュボードで Product と Price を作成し、Pro プランの Price ID を取得 → `STRIPE_PRO_PRICE_ID` Variables に設定
2. Webhook エンドポイント (`https://<backend>/webhooks/stripe`) を作成し、Signing Secret を `STRIPE_WEBHOOK_SECRET` Secret Manager に保存
3. Secret key を `STRIPE_SECRET_KEY` Secret Manager に保存

## 6. フロントエンド env (build 時に必要)

`frontend/.env.example` を参照し、`.env.local` (gitignore 対象) に値を埋めて開発する。CI/CD では GitHub Actions Variables 経由で渡される。

| Vite env                   | 用途                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `VITE_SITE_ORIGIN`         | canonical / OGP / sitemap に使うサイトオリジン                   |
| `VITE_COMPANY_NAME`        | 特商法表記の販売事業者名                                         |
| `VITE_REPRESENTATIVE_NAME` | 特商法表記の運営統括責任者                                       |
| `VITE_CONTACT_EMAIL`       | 特商法表記のメールアドレス                                       |
| `VITE_API_URL`             | バックエンドの URL (CI では `deploy-backend` の出力から自動設定) |
| `VITE_GA_TRACKING_ID`      | Google Analytics トラッキング ID (空なら埋め込まない)            |

## 7. 手動編集が必要なアセット

以下のアセットは build 時に動的置換されないため、フォーク時に手動で編集する必要がある:

- `frontend/public/ogp.svg`: 内部の `<text>` ノードに `example.com` がハードコードされている。OGP 画像内のサイトドメイン表示はビルド時に変換されないため、必要なら自社ドメインに書き換える。

## 8. CDKTF (infra) 実行

```bash
# 必要な env を export
export GCP_PROJECT_ID=my-project-prod
export GCP_REGION=asia-northeast1

cd infra
bun install
bunx cdktf synth
bunx cdktf deploy
```

未 export だと `infra/main.ts` のフォールバック値 (`example-project-id`) が使われ、Terraform plan 時にダミー値で進行するため、必ず実値を渡してから synth する。

## 9. デプロイの流れ

1. main ブランチへ push (CI 経由)
2. `.github/workflows/ci.yml` が成功
3. `.github/workflows/deploy.yml` が `workflow_run` で起動
4. 各 deploy ジョブの先頭で preflight validation 実行 (Variables 未設定で fail fast)
5. backend → backup → frontend の順でデプロイ

CI 経由が使えない場合は `docs/manual-deploy.md` のローカル手動デプロイ手順を参照。
