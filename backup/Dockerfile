FROM google/cloud-sdk:alpine

RUN apk add --no-cache postgresql-client tzdata

ENV TZ=Asia/Tokyo

WORKDIR /app

COPY backup.sh .

RUN chmod +x backup.sh

# 非 root ユーザーを作成して実行権限を最小化する (Trivy DS-0002 対応)。
# pg_dump / gsutil の実行に root 権限は不要なため、専用ユーザーで動作させる。
RUN adduser -D -u 1001 backup && chown -R backup:backup /app
USER backup

CMD ["./backup.sh"]
