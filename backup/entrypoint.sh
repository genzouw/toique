#!/bin/sh

# CRON_SCHEDULE のデフォルト値 (毎日午前3時 JST)
CRON_SCHEDULE=${CRON_SCHEDULE:-"0 3 * * *"}

echo "Starting cron scheduler with schedule: ${CRON_SCHEDULE}"

# JSONキーファイルを作成して環境変数として設定する
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
    echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/gcp-key.json
fi

# 環境変数をエクスポート (export -p で特殊文字を安全に処理)
export -p | grep -E '^export (POSTGRES|GCP|GCS)_' > /app/env.sh
if [ -f /app/gcp-key.json ]; then
    echo 'export GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-key.json' >> /app/env.sh
fi
chmod +x /app/env.sh


cat <<EOF > /app/run_backup.sh
#!/bin/sh
. /app/env.sh
/app/backup.sh
EOF

chmod +x /app/run_backup.sh

# cronの設定ファイルを作成 (ログはコンテナの標準出力に直接出力)
echo "${CRON_SCHEDULE} /app/run_backup.sh > /proc/1/fd/1 2>/proc/1/fd/2" > /etc/crontabs/root

# cronをフォアグラウンドで実行
exec crond -f -l 2
