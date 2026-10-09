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

# Cloud Run Jobs では Workload Identity (ADC) で自動認証される。
# ローカル開発では gcloud auth application-default login の ADC を利用。

# 最新のバックアップファイルを特定
echo "Searching for latest backup in gs://${GCS_BUCKET}/..."
# `gcloud storage ls` の失敗（権限不足・バケット不在など）を「バックアップ無し」と
# 区別するため、終了コードを握りつぶさずに取得する。
if ! BACKUP_LIST=$(gcloud storage ls "gs://${GCS_BUCKET}/"); then
  echo "Error: Failed to list gs://${GCS_BUCKET}/. Check bucket name and the storage.objects.list permission."
  exit 1
fi
LATEST_BACKUP=$(printf '%s\n' "${BACKUP_LIST}" | grep '\.sql\.gz$' | sort | tail -n 1 || true)

# バックアップが無い状態は「検証できていない」ので成功扱いにしない。
if [ -z "${LATEST_BACKUP}" ]; then
  echo "Error: No backup files found in gs://${GCS_BUCKET}/. Backups are not being created or are not readable."
  exit 1
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
