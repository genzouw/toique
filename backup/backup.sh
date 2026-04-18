#!/bin/sh

# 環境変数のチェック
if [ -z "$S3_BUCKET" ]; then
  echo "Error: S3_BUCKET is not set."
  exit 1
fi

if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_HOST" ]; then
  echo "Error: Database connection variables are not set."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="${POSTGRES_DB}_backup_${TIMESTAMP}.sql.gz"
BACKUP_FILEPATH="/tmp/${BACKUP_FILENAME}"

echo "Starting backup of database ${POSTGRES_DB} to ${BACKUP_FILEPATH}..."

# pg_dump を実行してgzip圧縮
export PGPASSWORD="${POSTGRES_PASSWORD}"
pg_dump -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" | gzip > "${BACKUP_FILEPATH}"

if [ $? -eq 0 ]; then
  echo "Backup successfully created at ${BACKUP_FILEPATH}."
else
  echo "Error: pg_dump failed."
  rm -f "${BACKUP_FILEPATH}"
  exit 1
fi

# S3 にアップロード
echo "Uploading backup to S3 bucket ${S3_BUCKET}..."
aws s3 cp "${BACKUP_FILEPATH}" "s3://${S3_BUCKET}/${BACKUP_FILENAME}"

if [ $? -eq 0 ]; then
  echo "Upload to S3 successful."
else
  echo "Error: Upload to S3 failed."
  rm -f "${BACKUP_FILEPATH}"
  exit 1
fi

# 一時ファイルの削除
rm -f "${BACKUP_FILEPATH}"
echo "Backup process completed successfully."
