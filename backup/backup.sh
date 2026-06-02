#!/bin/sh
set -eu
set -o pipefail

# 環境変数のチェック
if [ -z "$GCS_BUCKET" ]; then
  echo "Error: GCS_BUCKET is not set."
  exit 1
fi

# 接続情報: DATABASE_URL があれば優先 (Neon direct connection の接続文字列を想定)、
# なければ従来の POSTGRES_DB/USER/PASSWORD/HOST を使う (移行期の fallback)。
if [ -n "${DATABASE_URL:-}" ]; then
  # ファイル名生成のため dbname だけ URL から抽出する。
  # 形式: postgresql://user:pass@host[:port]/dbname[?params]
  url_tmp="${DATABASE_URL#postgresql://}"
  url_tmp="${url_tmp#postgres://}"
  url_tmp="${url_tmp%%\?*}"
  POSTGRES_DB="${url_tmp##*/}"
elif [ -z "${POSTGRES_DB:-}" ] || [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_HOST:-}" ]; then
  echo "Error: provide DATABASE_URL or all of POSTGRES_DB/USER/PASSWORD/HOST."
  exit 1
fi

# Cloud Run Jobs では Workload Identity (ADC) で自動認証される。
# ローカル開発では gcloud auth application-default login の ADC を利用。

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="${POSTGRES_DB}_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="/tmp/${BACKUP_FILENAME}"

echo "Starting backup of database ${POSTGRES_DB} to ${BACKUP_FILEPATH}..."

# pg_dump を実行してgzip圧縮
if [ -n "${DATABASE_URL:-}" ]; then
  pg_dump "${DATABASE_URL}" | gzip > "${BACKUP_FILEPATH}"
else
  export PGPASSWORD="${POSTGRES_PASSWORD}"
  pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILEPATH}"
fi

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
