# データベースバックアップ設定

このプロジェクトでは、データベースのバックアップを Google Cloud Storage (GCS) に保存する仕組みを提供しています。

## アーキテクチャ

本番環境では **Cloud Run Jobs + Cloud Scheduler** を利用して、毎日午前 3 時 (JST) に自動バックアップを実行します。

- **Cloud Run Jobs**: `backup/backup.sh` を実行するコンテナジョブ
- **Cloud Scheduler**: ジョブの定期実行トリガー（cron: `0 3 * * *`）
- **Workload Identity**: サービスアカウント (`backup-job@{PROJECT_ID}.iam.gserviceaccount.com`) による ADC 認証
- **Secret Manager**: DB 接続情報の安全な管理

```text
Cloud Scheduler (0 3 * * *) → Cloud Run Jobs → pg_dump → GCS バケット
```

## インフラ構成 (CDKTF)

すべてのリソースは `infra/main.ts` で CDKTF により管理されています。

| リソース                                          | 説明                                              |
| ------------------------------------------------- | ------------------------------------------------- |
| `ServiceAccount (backup-job)`                     | Cloud Run Jobs 用サービスアカウント               |
| `ProjectIamMember (storage.objectCreator)`        | GCS 書き込み権限                                  |
| `ProjectIamMember (secretmanager.secretAccessor)` | Secret Manager 読み取り権限                       |
| `CloudRunV2Job (db-backup)`                       | バックアップジョブ定義                            |
| `CloudSchedulerJob (db-backup-daily)`             | 定期実行スケジューラ                              |
| `StorageBucket (db-backups)`                      | バックアップファイル保存先（30 日ライフサイクル） |

### デプロイ手順

```bash
cd infra
npm install
gcloud auth application-default login
cdktf deploy
```

## Secret Manager に必要なシークレット

Cloud Run Jobs の環境変数として以下のシークレットを Secret Manager に登録してください。

| シークレット名        | 説明                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| `BACKUP_DATABASE_URL` | DB 接続文字列 (例: `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require`) |

> ⚠️ **アプリ用 `DATABASE_URL` とは別の Secret として管理する**
>
> Neon の **pooler endpoint** (`...-pooler.<region>.aws.neon.tech`) はセッション制御の制約で
> `pg_dump` が失敗するケースがあるため、バックアップ用には **direct connection endpoint**
> (`pooler` 無し) を使う必要がある。アプリ用の `DATABASE_URL` (pooler 経由) とは
> 接続先が異なるため、独立した Secret として `BACKUP_DATABASE_URL` を作成する。

```bash
# 接続情報を変数にセット (HOST は `-pooler` 無しの direct connection endpoint)
PG_USER='YOUR_USER'
PG_PASSWORD='YOUR_PASSWORD'
PG_HOST='YOUR_DIRECT_HOST.neon.tech' # ⚠️ pooler endpoint ではなく direct を指定
PG_DB='YOUR_DATABASE'

URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}/${PG_DB}?sslmode=require"

# Secret 作成 + 値投入 (printf でログ漏洩を避ける)
gcloud secrets create BACKUP_DATABASE_URL --project=<GCP_PROJECT_ID> --replication-policy=automatic
printf '%s' "${URL}" | gcloud secrets versions add BACKUP_DATABASE_URL --data-file=- --project=<GCP_PROJECT_ID>
```

## 手動実行

Cloud Run Jobs を手動で実行するには:

```bash
gcloud run jobs execute db-backup --region=asia-northeast1 --project=<GCP_PROJECT_ID>
```

## CI/CD

`main` ブランチへのマージ時に、GitHub Actions (`.github/workflows/deploy.yml`) が:

1. `backup/Dockerfile` からイメージをビルド
2. Artifact Registry にプッシュ
3. Cloud Run Job のイメージを更新

## ローカル開発

ローカル環境でバックアップをテストする場合は、`docker compose` の `backup` プロファイルを使用します。

### 前提条件

`gcloud` CLI がインストールされていること。ADC（Application Default Credentials）で GCS への認証を行います。

```bash
# 初回のみ: ADC を取得（ブラウザでGoogleアカウント認証）
gcloud auth application-default login
```

> **注意**: GCS バケットへのアクセスには、利用する Google アカウントに `roles/storage.objectCreator`（書き込み）または `roles/storage.objectViewer`（読み取り）が付与されている必要があります。

### 実行

```bash
# GCS にアップロードする場合
GCS_BUCKET=<bucket> docker compose run --rm backup

# ローカルにダンプのみ（GCS 不使用）
docker compose exec db pg_dump -U toique toique | gzip > backup.sql.gz
```

## リストア手順

1. GCS からバックアップファイルをダウンロードします。

   ```bash
   gcloud storage cp gs://<GCP_PROJECT_ID>-db-backups/<filename>.sql.gz ./
   ```

2. gzip を解凍します。

   ```bash
   gunzip <filename>.sql.gz
   ```

3. データベースにリストアします。

   ```bash
   psql -h <host> -p <port> -U <user> -d <db> -f <filename>.sql
   ```

## 月次リストアテスト

バックアップの信頼性を担保するため、毎月 1 日に GCS から最新バックアップをダウンロードし、テスト用データベースへのリストアを自動検証しています。

### 自動実行

GitHub Actions の `restore-test.yml` ワークフローが毎月 1 日 午前 4 時 (JST) に自動実行されます。

テスト内容:

1. GCS バケットから最新の `.sql.gz` ファイルを特定・ダウンロード
2. gzip 整合性チェック
3. テスト用 PostgreSQL データベースへリストア
4. テーブル数・レコード数の整合性チェック

### 手動実行

GitHub Actions の「Restore Test」ワークフローから `Run workflow` で手動実行できます。

ローカルで実行する場合:

```bash
# テスト用DBを起動
docker compose up -d db

# 環境変数を設定してスクリプトを実行
GCS_BUCKET=<GCP_PROJECT_ID>-db-backups \
POSTGRES_HOST=localhost \
POSTGRES_PORT=5433 \
POSTGRES_USER=toique \
POSTGRES_PASSWORD=toique \
POSTGRES_DB=toique \
bash backup/restore-test.sh
```

## 本番環境への展開

> **注意**: この仕組みはローカル/検証環境向けです。本番環境では Cloud Run Jobs + Cloud Scheduler での定期実行、または Cloud SQL の自動バックアップ/PITR の利用を推奨します。
