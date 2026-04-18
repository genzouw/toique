FROM postgres:17-alpine

RUN apk add --no-cache aws-cli tzdata

ENV TZ=Asia/Tokyo

WORKDIR /app

COPY backup.sh .
COPY entrypoint.sh .

RUN chmod +x backup.sh entrypoint.sh

CMD ["./entrypoint.sh"]
