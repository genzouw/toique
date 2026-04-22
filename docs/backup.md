# データベースバックアップ設定

このプロジェクトでは、データベースのバックアップを Google Cloud Storage (GCS) に保存する仕組みを提供しています。

## アーキテクチャ

本番環境では **Cloud Run Jobs + Cloud Scheduler** を利用して、毎日午前3時 (JST) に自動バックアップを実行します。

- **Cloud Run Jobs**: `backup/backup.sh` を実行するコンテナジョブ
- **Cloud Scheduler**: ジョブの定期実行トリガー（cron: `0 3 * * *`）
- **Workload Identity**: サービスアカウント (`backup-job@{PROJECT_ID}.iam.gserviceaccount.com`) による ADC 認証
- **Secret Manager**: DB 接続情報の安全な管理

```
Cloud Scheduler (0 3 * * *) → Cloud Run Jobs → pg_dump → GCS バケット
```

## インフラ構成 (CDKTF)

すべてのリソースは `infra/main.ts` で CDKTF により管理されています。

| リソース                                          | 説明                                             |
| ------------------------------------------------- | ------------------------------------------------ |
| `ServiceAccount (backup-job)`                     | Cloud Run Jobs 用サービスアカウント              |
| `ProjectIamMember (storage.objectCreator)`        | GCS 書き込み権限                                 |
| `ProjectIamMember (secretmanager.secretAccessor)` | Secret Manager 読み取り権限                      |
| `CloudRunV2Job (db-backup)`                       | バックアップジョブ定義                           |
| `CloudSchedulerJob (db-backup-daily)`             | 定期実行スケジューラ                             |
| `StorageBucket (db-backups)`                      | バックアップファイル保存先（30日ライフサイクル） |

### デプロイ手順

```bash
cd infra
npm install
gcloud auth application-default login
cdktf deploy
```

## Secret Manager に必要なシークレット

Cloud Run Jobs の環境変数として以下のシークレットを Secret Manager に登録してください。

| シークレット名             | 説明                                          |
| -------------------------- | --------------------------------------------- |
| `BACKUP_POSTGRES_DB`       | データベース名                                |
| `BACKUP_POSTGRES_USER`     | データベースユーザー                          |
| `BACKUP_POSTGRES_PASSWORD` | データベースパスワード                        |
| `BACKUP_POSTGRES_HOST`     | データベースホスト（Neon のエンドポイント等） |

```bash
echo -n "toique" | gcloud secrets create BACKUP_POSTGRES_DB --data-file=- --project=toique-app-prod
echo -n "toique" | gcloud secrets create BACKUP_POSTGRES_USER --data-file=- --project=toique-app-prod
echo -n "<password>" | gcloud secrets create BACKUP_POSTGRES_PASSWORD --data-file=- --project=toique-app-prod
echo -n "<host>" | gcloud secrets create BACKUP_POSTGRES_HOST --data-file=- --project=toique-app-prod
```

## 手動実行

Cloud Run Jobs を手動で実行するには:

```bash
gcloud run jobs execute db-backup --region=asia-northeast1 --project=toique-app-prod
```

## CI/CD

`main` ブランチへのマージ時に、GitHub Actions (`.github/workflows/deploy.yml`) が:

1. `backup/Dockerfile` からイメージをビルド
2. Artifact Registry にプッシュ
3. Cloud Run Job のイメージを更新

## ローカル開発

ローカル環境でバックアップをテストする場合は、`docker compose` の `backup` プロファイルを使用します。

```bash
# GCS にアップロードする場合
GCS_BUCKET=<bucket> GOOGLE_APPLICATION_CREDENTIALS=<path-to-key.json> \
  docker compose run --rm backup

# ローカルにダンプのみ（GCS 不使用）
docker compose exec db pg_dump -U toique toique | gzip > backup.sql.gz
```

## リストア手順

1. GCS からバックアップファイルをダウンロードします。
   ```bash
   gcloud storage cp gs://toique-app-prod-db-backups/<filename>.sql.gz ./
   ```
2. gzip を解凍します。
   ```bash
   gunzip <filename>.sql.gz
   ```
3. データベースにリストアします。
   ```bash
   psql -h <host> -p <port> -U <user> -d <db> -f <filename>.sql
   ```
