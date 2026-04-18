FROM google/cloud-sdk:alpine

RUN apk add --no-cache postgresql-client tzdata

ENV TZ=Asia/Tokyo

WORKDIR /app

COPY backup.sh .
COPY entrypoint.sh .

RUN chmod +x backup.sh entrypoint.sh

CMD ["./entrypoint.sh"]
