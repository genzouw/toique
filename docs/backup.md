# データベースバックアップ設定

このプロジェクトでは、データベースのバックアップを Google Cloud Storage (GCS) に保存する仕組みを提供しています。

## 概要

`docker compose`の `backup` サービスとして組み込まれており、定期的に（デフォルトで毎日午前3時に）`pg_dump`によるバックアップを実行し、その結果をgzip圧縮して GCP の Cloud Storage にアップロードします。

## GCSバケットの準備 (CDKTFを使用)

バックアップを利用するためには、アップロード先となる GCS のバケットを作成し、そのバケットへ書き込み権限を持つサービスアカウントの認証情報（JSONキー）を用意する必要があります。

このプロジェクトでは、CDK for Terraform (CDKTF) を用いて、バックアップ用のバケット (`toique-app-prod-db-backups`) を構築できます。

### バケットの構築手順

Terraform および CDKTF がインストールされていることを前提とします。

1. `infra` ディレクトリに移動します。
   ```bash
   cd infra
   ```
2. 依存パッケージをインストールします。
   ```bash
   npm install
   ```
3. GCPの認証を行います（構築を実行するユーザーの権限で実行します）。
   ```bash
   gcloud auth application-default login
   ```
4. CDKTFでデプロイを実行します。
   ```bash
   cdktf deploy
   ```

## 環境変数の設定

`docker compose` を実行する環境、または `.env` ファイルに以下の環境変数を設定してください。

- `GCP_PROJECT_ID`: GCPのプロジェクトID (例: `toique-app-prod`)
- `GCS_BUCKET`: バックアップファイルのアップロード先となるGCSバケット名 (例: `toique-app-prod-db-backups`)
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`: GCSへの書き込み権限を持つサービスアカウントのJSONキーの中身 (改行を含んだJSON文字列をそのまま指定)
- `CRON_SCHEDULE`: バックアップの実行スケジュール（任意。デフォルトは `"0 3 * * *"` で毎日午前3時 JST）
- `POSTGRES_PASSWORD`: データベースのパスワード（任意。デフォルトは `toique`）

### .envファイルの設定例

```env
GCP_PROJECT_ID=toique-app-prod
GCS_BUCKET=toique-app-prod-db-backups
# JSONは1行にするか、クォートで囲む等環境に合わせて適切に設定してください
GOOGLE_APPLICATION_CREDENTIALS_JSON='{
  "type": "service_account",
  "project_id": "toique-app-prod",
  ...
}'
CRON_SCHEDULE="0 3 * * *"
```

## 動作確認

環境変数を設定した上で、`docker compose up -d` を実行すると、`backup` コンテナが起動し、cronによってスケジュールされた日時にバックアップスクリプトが実行されます。
バックアップファイルのファイル名は `<POSTGRES_DB>_backup_<TIMESTAMP>.sql.gz` となります。

バックアップの実行ログを確認するには以下のコマンドを使用します。

```bash
docker compose logs -f backup
```

## 本番環境への展開

> **注意**: この仕組みはローカル/検証環境向けです。本番環境では Cloud Run Jobs + Cloud Scheduler での定期実行、または Cloud SQL の自動バックアップ/PITR の利用を推奨します。
