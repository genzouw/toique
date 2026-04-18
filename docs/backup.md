# データベースバックアップ設定

このプロジェクトでは、データベースのバックアップをAmazon S3に保存する仕組みを提供しています。

## 概要

`docker compose`の `backup` サービスとして組み込まれており、定期的に（デフォルトで毎日午前3時に）`pg_dump`によるバックアップを実行し、その結果をgzip圧縮してAWS S3にアップロードします。

## AWS S3の準備

バックアップを利用するためには、アップロード先となるAmazon S3のバケットを作成し、そのバケットへ書き込み権限を持つIAMユーザーの認証情報（アクセスキーID、シークレットアクセスキー）を用意する必要があります。

## 環境変数の設定

`docker compose` を実行する環境、または `.env` ファイルに以下の環境変数を設定してください。

* `S3_BUCKET`: バックアップファイルのアップロード先となるS3バケット名（必須）
* `AWS_ACCESS_KEY_ID`: IAMユーザーのアクセスキーID（必須）
* `AWS_SECRET_ACCESS_KEY`: IAMユーザーのシークレットアクセスキー（必須）
* `AWS_DEFAULT_REGION`: S3バケットのリージョン（任意。デフォルトは `ap-northeast-1`）
* `CRON_SCHEDULE`: バックアップの実行スケジュール（任意。デフォルトは `"0 3 * * *"` で毎日午前3時）
* `POSTGRES_PASSWORD`: データベースのパスワード（任意。デフォルトは `toique`）

### .envファイルの設定例

```env
S3_BUCKET=my-toique-backup-bucket
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=ap-northeast-1
CRON_SCHEDULE="0 3 * * *"
```

## 動作確認

環境変数を設定した上で、`docker compose up -d` を実行すると、`backup` コンテナが起動し、cronによってスケジュールされた日時にバックアップスクリプトが実行されます。
バックアップファイルのファイル名は `<POSTGRES_DB>_backup_<TIMESTAMP>.sql.gz` となります。

バックアップの実行ログを確認するには以下のコマンドを使用します。

```bash
docker compose logs -f backup
```

## 本番環境への展開 (Fly.ioなどの場合)

Fly.ioなどの環境にデプロイする場合は、同様の環境変数をシークレットとして設定するか、Fly.ioのcron機能（Fly Machinesの場合はスケジュール実行など）を利用して、バックアップ用のコンテナまたはタスクを実行するように設定を調整してください。