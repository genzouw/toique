#!/bin/sh
set -eu
set -o pipefail

# 環境変数のチェック
if [ -z "$GCS_BUCKET" ]; then
  echo "Error: GCS_BUCKET is not set."
  exit 1
fi

# 接続情報: Neon direct connection の DATABASE_URL を必須とする。
# (旧 POSTGRES_DB/USER/PASSWORD/HOST 系の fallback は移行完了に伴い削除)
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set."
  exit 1
fi

# ファイル名生成のため dbname だけ URL から抽出する。
# 形式: postgresql://user:pass@host[:port]/dbname[?params]
# パスワードに `?` が含まれる場合、先に `%%[?]*` を適用するとパス部分ごと切り捨てられる。
# そのため、先にパス（`/`）の存在を確認してから元の URL 末尾（`##*/`）を抽出し、
# その後でクエリパラメータを除去する。`%%[?]*` は ash 互換のためリテラル `?` を明示する。
url_without_scheme="${DATABASE_URL#postgresql://}"
url_without_scheme="${url_without_scheme#postgres://}"
if [ "${url_without_scheme}" = "${url_without_scheme#*/}" ]; then
  echo "Error: DATABASE_URL does not contain a database name path."
  exit 1
fi
db_and_params="${DATABASE_URL##*/}"
POSTGRES_DB="${db_and_params%%[?]*}"
if [ -z "${POSTGRES_DB}" ]; then
  echo "Error: Extracted database name is empty."
  exit 1
fi

# Cloud Run Jobs では Workload Identity (ADC) で自動認証される。
# ローカル開発では gcloud auth application-default login の ADC を利用。

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="${POSTGRES_DB}_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="/tmp/${BACKUP_FILENAME}"

echo "Starting backup of database ${POSTGRES_DB} to ${BACKUP_FILEPATH}..."

# pg_dump を実行してgzip圧縮
pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILEPATH}"

echo "Backup successfully created at ${BACKUP_FILEPATH}."

# バックアップファイルの整合性チェック
gzip -t "${BACKUP_FILEPATH}"
BACKUP_SIZE=$(stat -c %s "${BACKUP_FILEPATH}" 2>/dev/null || stat -f %z "${BACKUP_FILEPATH}")
if [ "$BACKUP_SIZE" -lt 1024 ]; then
  echo "Error: backup file suspiciously small: ${BACKUP_SIZE} bytes"
  exit 1
fi
echo "Integrity check passed (${BACKUP_SIZE} bytes)."

# GCS にアップロード
echo "Uploading backup to GCS bucket ${GCS_BUCKET}..."
gcloud storage cp "${BACKUP_FILEPATH}" "gs://${GCS_BUCKET}/${BACKUP_FILENAME}"

echo "Upload to GCS successful."

# 一時ファイルの削除
rm -f "${BACKUP_FILEPATH}"
echo "Backup process completed successfully."
