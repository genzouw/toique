#!/bin/sh

# CRON_SCHEDULE のデフォルト値 (毎日午前3時 JST)
CRON_SCHEDULE=${CRON_SCHEDULE:-"0 3 * * *"}

echo "Starting cron scheduler with schedule: ${CRON_SCHEDULE}"

# JSONキーファイルを作成して環境変数として設定する
if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
    echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/gcp-key.json
fi

# jsonの中身を除く環境変数をエクスポート (JSONを直接扱うのを避ける)
printenv | grep -E '^(POSTGRES|GCP|GCS)_' | sed 's/^\(.*\)=\(.*\)$/export \1="\2"/' > /app/env.sh
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

# cronの設定ファイルを作成
echo "${CRON_SCHEDULE} /app/run_backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

# ログファイルの作成
touch /var/log/backup.log

# cronをフォアグラウンドで実行
crond -f -l 2 &

# ログを標準出力に流す
tail -f /var/log/backup.log
