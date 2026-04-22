#!/bin/bash
set -eu
set -o pipefail

# リストア検証スクリプト
# GCSから最新バックアップをダウンロードし、テスト用DBにリストアして整合性を検証する

# 環境変数のチェック
if [ -z "${GCS_BUCKET:-}" ]; then
  echo "Error: GCS_BUCKET is not set."
  exit 1
fi

if [ -z "${POSTGRES_HOST:-}" ] || [ -z "${POSTGRES_USER:-}" ] || [ -z "${POSTGRES_PASSWORD:-}" ] || [ -z "${POSTGRES_DB:-}" ]; then
  echo "Error: Database connection variables are not set."
  exit 1
fi

POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export PGPASSWORD="${POSTGRES_PASSWORD}"

# GCS認証（キーファイルがある場合）
if [ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ] && [ -f "${GOOGLE_APPLICATION_CREDENTIALS}" ]; then
  gcloud auth activate-service-account --key-file="${GOOGLE_APPLICATION_CREDENTIALS}"
fi

# 最新のバックアップファイルを特定
echo "Searching for latest backup in gs://${GCS_BUCKET}/..."
LATEST_BACKUP=$(gcloud storage ls "gs://${GCS_BUCKET}/" 2>/dev/null | grep '\.sql\.gz$' | sort | tail -n 1 || true)

if [ -z "${LATEST_BACKUP}" ]; then
  echo "Warning: No backup files found in gs://${GCS_BUCKET}/. Skipping restore test."
  exit 0
fi

echo "Latest backup: ${LATEST_BACKUP}"

# バックアップファイルをダウンロード
BACKUP_FILENAME=$(basename "${LATEST_BACKUP}")
DOWNLOAD_PATH="/tmp/${BACKUP_FILENAME}"
SQL_PATH="/tmp/${BACKUP_FILENAME%.gz}"

# 一時ファイルのクリーンアップ（正常終了・エラー時の両方で実行）
cleanup() {
  rm -f "${DOWNLOAD_PATH}" "${SQL_PATH}"
}
trap cleanup EXIT

echo "Downloading ${BACKUP_FILENAME}..."
gcloud storage cp "${LATEST_BACKUP}" "${DOWNLOAD_PATH}"

# gzip整合性チェック
echo "Verifying gzip integrity..."
gzip -t "${DOWNLOAD_PATH}"
echo "Integrity check passed."

# 解凍
gunzip -f "${DOWNLOAD_PATH}"

# リストア前にDBを初期化（冪等性の確保）
echo "Cleaning target database ${POSTGRES_DB}..."
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true

# リストア実行
echo "Restoring backup to ${POSTGRES_DB}..."
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -f "${SQL_PATH}"
RESTORE_EXIT=$?

if [ "${RESTORE_EXIT}" -ne 0 ]; then
  echo "Error: Restore failed with exit code ${RESTORE_EXIT}"
  exit 1
fi

echo "Restore completed successfully."

# 整合性チェック: テーブル数の確認
TABLE_COUNT=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
TABLE_COUNT=$(echo "${TABLE_COUNT}" | tr -d ' ')

if [ "${TABLE_COUNT}" -eq 0 ]; then
  echo "Error: No tables found after restore."
  exit 1
fi

echo "Verification: ${TABLE_COUNT} tables found."

# 統計情報を最新化（n_live_tupの精度向上のため）
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "ANALYZE;"

# 整合性チェック: 各テーブルのレコード数
echo ""
echo "=== Table record counts ==="
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c \
  "SELECT schemaname || '.' || relname AS table, n_live_tup AS rows
   FROM pg_stat_user_tables ORDER BY relname;" | while read -r line; do
  if [ -n "${line}" ]; then
    echo "  ${line}"
  fi
done
echo "==========================="

echo ""
echo "Restore test completed successfully."
echo "  Backup file: ${BACKUP_FILENAME}"
echo "  Tables restored: ${TABLE_COUNT}"
