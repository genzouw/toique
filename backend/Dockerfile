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

# ローカル開発用
FROM base AS dev
EXPOSE 3000
CMD ["bun", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
RUN bun run format:check && bun run lint && bun run build

# CI: test with coverage (DATABASE_URL は実行時に渡す)
FROM base AS ci-test
COPY db/migrations ./db/migrations
ENV DRIZZLE_MIGRATIONS_DIR=./db/migrations
CMD ["bun", "run", "test:coverage"]

# 本番ビルド
FROM base AS build
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
