# infra/

CDKTF (TypeScript) で書かれた GCP インフラ定義。

## 管理対象リソース

- `toique-app-prod-db-backups` GCS バケット（DB バックアップ保管）
- `db-backup` Cloud Run Job（pg_dump 実行）
- `db-backup-daily` Cloud Scheduler（毎日 3:00 JST 起動）
- `backup-job@toique-app-prod.iam.gserviceaccount.com` SA とその IAM 設定
- `github-pool` Workload Identity Pool
- `github-provider` Workload Identity Pool Provider（OIDC）
- `github-deployer@toique-app-prod.iam.gserviceaccount.com` SA とその IAM 設定
- WIF → SA binding（principalSet を当該 GitHub リポジトリに限定）

## 必要な環境変数

`cdktf synth` / `cdktf deploy` を実行する前に export しておく:

| 環境変数             | 用途                                        | デフォルト                   |
| -------------------- | ------------------------------------------- | ---------------------------- |
| `GCP_PROJECT_ID`     | 対象 GCP プロジェクト ID                    | `example-project-id`         |
| `GCP_PROJECT_NUMBER` | WIF principalSet で利用するプロジェクト番号 | `000000000000`               |
| `GCP_REGION`         | Cloud Run / GCS の region                   | `asia-northeast1`            |
| `GITHUB_REPOSITORY`  | WIF が認可する `<owner>/<repo>`             | `example-owner/example-repo` |

未設定の場合はそれぞれ動かない（synth はできるが apply 時に GCP 側でエラー）。

## 通常運用

```bash
cd infra
bun install --frozen-lockfile

# 必須 env を export
export GCP_PROJECT_ID=toique-app-prod
export GCP_PROJECT_NUMBER=800954033936
export GCP_REGION=asia-northeast1
export GITHUB_REPOSITORY=genzouw/toique

# 認証 (個人 or 適切な権限を持つアカウント)
gcloud auth login
gcloud auth application-default login

# 変更内容の確認
bunx cdktf synth
bunx cdktf diff

# 適用
bunx cdktf deploy
```

## 既存リソースの取り込み（初回のみ）

WIF Pool / Provider / `github-deployer` SA は元々 gcloud で手動構築されていた。これらを CDKTF 管理下に取り込むには `cdktf import` を 1 回実行する必要がある。**未 import の状態で `cdktf deploy` すると「既存リソースが存在する」というエラーで失敗する。**

### import 手順

```bash
cd infra

# 環境変数を export 済みの前提

# 1. WIF Pool
bunx cdktf import \
  --resource-type google_iam_workload_identity_pool \
  --resource-id projects/$GCP_PROJECT_ID/locations/global/workloadIdentityPools/github-pool \
  --resource-name github-pool

# 2. WIF Provider
bunx cdktf import \
  --resource-type google_iam_workload_identity_pool_provider \
  --resource-id projects/$GCP_PROJECT_ID/locations/global/workloadIdentityPools/github-pool/providers/github-provider \
  --resource-name github-provider

# 3. github-deployer SA
bunx cdktf import \
  --resource-type google_service_account \
  --resource-id projects/$GCP_PROJECT_ID/serviceAccounts/github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --resource-name github-deployer-sa

# 4. SA への各 role (4 件)
for role in run-admin artifactregistry-writer secretmanager-secretAccessor iam-serviceAccountUser; do
  case "$role" in
    run-admin) ROLE='roles/run.admin' ;;
    artifactregistry-writer) ROLE='roles/artifactregistry.writer' ;;
    secretmanager-secretAccessor) ROLE='roles/secretmanager.secretAccessor' ;;
    iam-serviceAccountUser) ROLE='roles/iam.serviceAccountUser' ;;
  esac
  bunx cdktf import \
    --resource-type google_project_iam_member \
    --resource-id "$GCP_PROJECT_ID $ROLE serviceAccount:github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
    --resource-name "github-deployer-$role"
done

# 5. WIF → SA binding
bunx cdktf import \
  --resource-type google_service_account_iam_member \
  --resource-id "projects/$GCP_PROJECT_ID/serviceAccounts/github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com roles/iam.workloadIdentityUser principalSet://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/$GITHUB_REPOSITORY" \
  --resource-name github-deployer-wif-binding
```

import 後に `bunx cdktf diff` を実行し、差分が `attribute_condition` の変更（広い→厳格）と principalSet の絞り込みのみであることを確認してから `cdktf deploy` する。

### 既存の WIF が「広い condition」だった場合の注意

`cdktf deploy` 適用前にすでに広い `attribute_condition`（例: `assertion.repository_owner == 'genzouw'`）で運用していた場合、apply によって厳格条件に切り替わる。切り替え直後の **進行中の Workflow に対する OIDC 認証は影響を受けない**（GitHub Actions が token を発行するタイミングで GCP 側の WIF Provider 設定が参照されるため）。次回以降の workflow から新条件で評価される。

apply 前にすでに「同オーナー他リポ」から OIDC を使っていた場合は、それらが認証失敗するようになる点に注意。

## バックアップ関連の運用は `docs/backup.md` を参照
