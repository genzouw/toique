# infra/

CDKTF (TypeScript) で書かれた GCP インフラ定義。

## 管理対象リソース

- `<PROJECT_ID>-db-backups` GCS バケット（DB バックアップ保管）
- `db-backup` Cloud Run Job（pg_dump 実行）
- `db-backup-daily` Cloud Scheduler（毎日 3:00 JST 起動）
- `backup-job@<PROJECT_ID>.iam.gserviceaccount.com` SA とその IAM 設定（`roles/run.invoker` は `db-backup` Job リソース限定で付与）
- `github-pool` Workload Identity Pool
- `github-provider` Workload Identity Pool Provider（OIDC、`attribute_condition` で `repository` × `ref` をガード）
- `github-deployer@<PROJECT_ID>.iam.gserviceaccount.com` SA とその IAM 設定
- WIF → SA binding（`principal://` subject で `repo:<owner>/<repo>:ref:refs/heads/main` のみ許可）
- runtime SA への `roles/iam.serviceAccountUser` 個別 binding（Compute default SA + `backup-job`）

## 必要な環境変数

`cdktf synth` / `cdktf deploy` を実行する前に export しておく:

| 環境変数             | 用途                                                                                 | デフォルト           | 必須？                                               |
| -------------------- | ------------------------------------------------------------------------------------ | -------------------- | ---------------------------------------------------- |
| `GCP_PROJECT_ID`     | 対象 GCP プロジェクト ID                                                             | `example-project-id` | 任意 (apply 時に必要)                                |
| `GCP_PROJECT_NUMBER` | WIF principal URL で利用するプロジェクト番号                                         | -                    | **必須** (未設定なら `cdktf synth` がエラーで落ちる) |
| `GCP_REGION`         | Cloud Run / GCS の region                                                            | `asia-northeast1`    | 任意                                                 |
| `GITHUB_REPOSITORY`  | WIF が認可する `<owner>/<repo>`                                                      | -                    | **必須** (未設定なら `cdktf synth` がエラーで落ちる) |
| `ARTIFACT_REPO`      | Artifact Registry リポジトリ名                                                       | `toique`             | 任意 (既定値以外を使う場合は import 手順でも必須)    |
| `TF_STATE_BUCKET`    | Terraform state を保管する GCS バケット名 (Backend バケット、CDKTF 管理外で事前作成) | -                    | **必須** (未設定なら `cdktf synth` がエラーで落ちる) |

未設定の場合はそれぞれ動かない（synth はできるが apply 時に GCP 側でエラー）。

## 通常運用

```bash
cd infra
bun install --frozen-lockfile

# 必須 env を export
export GCP_PROJECT_ID=your-gcp-project-id
export GCP_PROJECT_NUMBER=123456789012
export GCP_REGION=asia-northeast1
export GITHUB_REPOSITORY=owner/repo
export TF_STATE_BUCKET=your-terraform-state-bucket
# 既定の `toique` 以外のリポジトリ名を使う場合のみ export
# export ARTIFACT_REPO=your-artifact-repo

# 認証 (個人 or 適切な権限を持つアカウント)
gcloud auth login
gcloud auth application-default login

# 変更内容の確認
bunx cdktf synth
bunx cdktf diff

# 適用
bunx cdktf deploy
```

## Terraform Backend バケット（GCS）の事前準備（初回のみ）

CDKTF の state は GCS バケットで一元管理する。Backend バケット自体は CDKTF 管理外で事前作成する（chicken-and-egg を避けるため）。

```bash
# 環境変数を export 済みの前提
gcloud storage buckets create gs://$TF_STATE_BUCKET \
  --project=$GCP_PROJECT_ID \
  --location=$GCP_REGION \
  --default-storage-class=STANDARD \
  --uniform-bucket-level-access \
  --public-access-prevention

# Versioning を有効化（state 破損時のロールバックに必須）
gcloud storage buckets update gs://$TF_STATE_BUCKET --versioning

# 非現行バージョンを 30 日で削除する Lifecycle ポリシー（コスト抑制）
cat > /tmp/tfstate-lifecycle.json <<'EOF'
{
  "rule": [
    {"action": {"type": "Delete"}, "condition": {"daysSinceNoncurrentTime": 30}}
  ]
}
EOF
gcloud storage buckets update gs://$TF_STATE_BUCKET \
  --lifecycle-file=/tmp/tfstate-lifecycle.json
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

# 5. runtime SA への SA User binding (Compute default SA)
bunx cdktf import \
  --resource-type google_service_account_iam_member \
  --resource-id "projects/$GCP_PROJECT_ID/serviceAccounts/$GCP_PROJECT_NUMBER-compute@developer.gserviceaccount.com roles/iam.serviceAccountUser serviceAccount:github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --resource-name github-deployer-compute-sa-user

# 6. runtime SA への SA User binding (backup-job)
bunx cdktf import \
  --resource-type google_service_account_iam_member \
  --resource-id "projects/$GCP_PROJECT_ID/serviceAccounts/backup-job@$GCP_PROJECT_ID.iam.gserviceaccount.com roles/iam.serviceAccountUser serviceAccount:github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --resource-name github-deployer-backup-sa-user

# 7. WIF → SA binding (principal:// で main branch subject に限定)
bunx cdktf import \
  --resource-type google_service_account_iam_member \
  --resource-id "projects/$GCP_PROJECT_ID/serviceAccounts/github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com roles/iam.workloadIdentityUser principal://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/subject/repo:$GITHUB_REPOSITORY:ref:refs/heads/main" \
  --resource-name github-deployer-wif-binding

# 8. Secret Manager シークレット本体 (4件)
for secret in BACKUP_POSTGRES_DB BACKUP_POSTGRES_USER BACKUP_POSTGRES_PASSWORD BACKUP_POSTGRES_HOST; do
  bunx cdktf import \
    --resource-type google_secret_manager_secret \
    --resource-id "projects/$GCP_PROJECT_ID/secrets/$secret" \
    --resource-name "backup-secret-$secret"
done

# 9. Artifact Registry リポジトリ
bunx cdktf import \
  --resource-type google_artifact_registry_repository \
  --resource-id "projects/$GCP_PROJECT_ID/locations/$GCP_REGION/repositories/${ARTIFACT_REPO:-toique}" \
  --resource-name "artifact-repo"
```

import 後に `bunx cdktf diff` を実行し、差分が以下の意図したものだけであることを確認してから `cdktf deploy` する:

- `attribute_condition` の変更（広い → 厳格）
- 既存の `principalSet://...attribute.repository_owner/...` 等の広い binding がある場合、それは Terraform 管理外なので diff には現れない（後述「広い binding の手動確認・削除」で対処）

### `cdktf deploy` 適用時の挙動と既存 Workflow への影響

GCP の WIF `attribute_condition` は **Google STS の token 交換時点** で評価されるため、apply の影響は以下のように分かれる:

- 既に STS 交換済みの access token を保持しているステップ → 引き続き動作（access token の TTL が切れるまで）
- apply 後に新たに STS 交換が必要なステップ → 新条件で評価され、満たさない場合は認証失敗

つまり apply の瞬間に進行中の Workflow が即座に途切れるわけではないが、access token の更新タイミング以降は新条件が適用される。GitHub Actions の OIDC token そのものは GitHub が常に発行する（`attribute_condition` は GitHub 側の token 発行を制御しない）。

apply 前にすでに「同オーナー他リポ」から OIDC を使っていた場合、その他リポは新条件で STS 交換に失敗するようになる点に注意。

### 広い binding の手動確認・削除（重要）

`google_service_account_iam_member` は **加算的 (additive)** で、Terraform 管理外の既存 binding は触らない。本 PR の apply で「新しい厳格な binding が追加」されるだけで、既存に広い `principalSet (owner 単位)` の binding が残っていれば **依然として広い権限が有効** な状態になる。apply 後に必ず手動で確認・削除すること:

```bash
# 既存の workloadIdentityUser binding を全件取得
gcloud iam service-accounts get-iam-policy \
  github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --format=json \
  | jq '.bindings[] | select(.role == "roles/iam.workloadIdentityUser")'

# 期待される member は以下 1 件のみ:
#   principal://iam.googleapis.com/projects/$GCP_PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/subject/repo:$GITHUB_REPOSITORY:ref:refs/heads/main
#
# 上記以外（特に `attribute.repository_owner/...` や `attribute.repository/...` の
# 別 owner/repo, 別 branch の binding）があれば手動削除する:
gcloud iam service-accounts remove-iam-policy-binding \
  github-deployer@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="<削除する member の値>"
```

### backup-sa の旧 Project-wide `roles/run.developer` 削除

`infra/main.ts` の H-4 対応で、`backup-sa` (`backup-job@<PROJECT_ID>.iam.gserviceaccount.com`) の Cloud Run 実行権限を Project 全体の `roles/run.developer` から **`db-backup` Job リソース限定** の `roles/run.invoker` に縮小した。`cdktf deploy` は新しい Job 単位 binding を **追加** するが、既存の Project IAM 上の `roles/run.developer` は加算性のため自動削除されない。apply 後に必ず手動で削除すること:

```bash
# 既存の Project IAM binding を確認
gcloud projects get-iam-policy $GCP_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:backup-job@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --format="table(bindings.role)"

# `roles/run.developer` があれば削除（縮小後は不要）
gcloud projects remove-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:backup-job@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role=roles/run.developer

# 確認: Job リソース単位の binding が新しく入っていることをチェック
gcloud run jobs get-iam-policy db-backup \
  --region=$GCP_REGION --project=$GCP_PROJECT_ID
# 期待: roles/run.invoker に serviceAccount:backup-job@... が 1 件
```

### Artifact Registry クリーンアップポリシー初回適用時の注意

`infra/main.ts` で定義している `cleanupPolicies` は `cdktf deploy` の **適用と同時に評価され、条件にマッチしたバージョンを実削除する** 仕様（Cleanup Policy は Dry-run モードを明示しない限り即時削除モード）。本リポジトリでは以下の3ルールを設定している:

- `keep-latest-10` (KEEP): 最新10件は何があっても保持
- `delete-untagged` (DELETE): タグなしイメージを1日後に削除
- `delete-older-than-30-days` (DELETE): 30日経過したイメージを削除（KEEP > DELETE で評価されるため最新10件は守られる）

**初回 `cdktf deploy` の挙動**:

既存環境で 30 日以上前のタグ付きイメージが残っている場合、初回 apply の瞬間にそれらが（最新10件を除き）すべて削除される。ロールバック先として古いタグを参照していた場合は事前に対象を確認しておくこと。

挙動を事前に確認したい場合は、`infra/main.ts` の `ArtifactRegistryRepository` リソースに一時的に `cleanupPolicyDryRun: true` を追加して apply し、Cloud Logging の `artifactregistry.googleapis.com/cleanup-policy-events` で削除候補をログ確認した上でフラグを外す二段階運用も可能（[Cleanup policy dry run](https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy#dry-run) 参照）。

## バックアップ関連の運用は `docs/backup.md` を参照
