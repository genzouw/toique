FROM google/cloud-sdk:alpine

# alpine はパッケージの旧バージョンをリポジトリから削除するため、バージョン固定すると
# かえってビルドが壊れる。ベースイメージ更新で追随する方針とし DL3018 は抑止する。
# hadolint ignore=DL3018
RUN apk add --no-cache postgresql-client tzdata

ENV TZ=Asia/Tokyo

WORKDIR /app

COPY backup.sh .

RUN chmod +x backup.sh

# 非 root ユーザーを作成して実行権限を最小化する (Trivy DS-0002 対応)。
# pg_dump / gsutil の実行に root 権限は不要なため、専用ユーザーで動作させる。
RUN adduser -D -u 1001 backup && chown -R backup:backup /app
USER backup

# Cloud Run Jobs での一回実行 (バッチ) コンテナのため、稼働中サービスを前提とする
# HEALTHCHECK は概念上適用されない。`HEALTHCHECK NONE` でベースイメージから継承し得る
# ヘルスチェックを明示的に無効化しつつ、Trivy DS-0026 (No HEALTHCHECK defined) を解消する。
HEALTHCHECK NONE

CMD ["./backup.sh"]
