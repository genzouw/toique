#!/bin/sh
set -eu
set -o pipefail

# 環境変数のチェック
if [ -z "$GCS_BUCKET" ]; then
  echo "Error: GCS_BUCKET is not set."
  exit 1
fi

if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_HOST" ]; then
  echo "Error: Database connection variables are not set."
  exit 1
fi

# Cloud Run Jobs では Workload Identity (ADC) で自動認証される。
# ローカル開発では gcloud auth application-default login の ADC を利用。

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="${POSTGRES_DB}_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="/tmp/${BACKUP_FILENAME}"

echo "Starting backup of database ${POSTGRES_DB} to ${BACKUP_FILEPATH}..."

# pg_dump を実行してgzip圧縮
export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILEPATH}"

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
