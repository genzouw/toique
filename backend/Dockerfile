# ビルドコンテキスト: リポジトリルート
#
# ベースイメージは Bun のバージョンを明示固定する。`.github/workflows/deploy.yml` の
# `oven-sh/setup-bun` で migrations 用ランナーも同じ Bun (1.3.14) を使うため、両者が
# ズレない構成になっている。Bun を上げる際は両方を同時に更新する。
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
COPY backend/package.json backend/bun.lock ./
RUN --mount=type=cache,target=/root/.bun,sharing=locked bun install --frozen-lockfile
COPY backend/ .
COPY .prettierrc .
# 派生ステージ (dev / ci-check / ci-test / build) で `USER bun` に切り替えた際に
# /app 配下への書き込み権限不足で失敗しないよう、所有権を bun ユーザーに揃える。
# Codacy / DS-0002 (No User defined) 対応として、root 実行を避けるための準備。
RUN chown -R bun:bun /app

# ローカル開発用
FROM base AS dev
EXPOSE 3000
USER bun
# Trivy DS-0026 対応。`/health` エンドポイントは src/index.ts:48 で常時 200 を返す。
# busybox wget は alpine ベースイメージに同梱されているため追加インストール不要。
# `-O /dev/null` でレスポンスボディを破棄し、ディスクへの書き込みを防ぐ (PR #418 と同方針)。
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 -O /dev/null http://127.0.0.1:3000/health || exit 1
CMD ["bun", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
USER bun
RUN bun run format:check && bun run lint && bun run build

# CI: test with coverage (DATABASE_URL は実行時に渡す)
FROM base AS ci-test
COPY --chown=bun:bun db/migrations ./db/migrations
ENV DRIZZLE_MIGRATIONS_DIR=./db/migrations
USER bun
CMD ["bun", "run", "test:coverage"]

# 本番ビルド
FROM base AS build
USER bun
RUN bun run build

# 本番実行用
FROM oven/bun:1.3.14-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# COPY は `--chown=bun:bun` を付与して、後段の `USER bun` 切替後に権限不整合で
# EACCES に遭遇しないように所有権を整える (将来 tmp 書き込み等が増えた際の地雷予防)。
COPY --chown=bun:bun --from=build /app/package.json /app/bun.lock ./
RUN --mount=type=cache,target=/root/.bun,sharing=locked bun install --production --frozen-lockfile
COPY --chown=bun:bun --from=build /app/dist ./dist
COPY --chown=bun:bun --from=build /app/src/schema.ts ./src/schema.ts
COPY --chown=bun:bun --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --chown=bun:bun --from=build /app/tsconfig.json ./tsconfig.json
COPY --chown=bun:bun db/migrations ./db/migrations
# drizzle-kit はマイグレーション専用ツールで実行時は不要。CI/CD (deploy.yml の
# `bunx drizzle-kit migrate` ステップ) で実行するため、本番イメージには含めない。
EXPOSE 8080
USER bun
CMD ["bun", "dist/index.js"]
