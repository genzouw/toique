# ビルドコンテキスト: リポジトリルート
FROM oven/bun:alpine AS base
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
FROM oven/bun:alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock ./
RUN --mount=type=cache,target=/root/.bun,sharing=locked bun install --production --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/schema.ts ./src/schema.ts
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY db/migrations ./db/migrations
# drizzle-kit はマイグレーション専用ツールで実行時は不要。CI/CD (deploy.yml の
# `bunx drizzle-kit migrate` ステップ) で実行するため、本番イメージには含めない。
EXPOSE 8080
USER bun
CMD ["bun", "dist/index.js"]
