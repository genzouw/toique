# ビルドコンテキスト: リポジトリルート
FROM node:26-alpine AS base
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --prefer-offline
COPY backend/ .
COPY .prettierrc .

# ローカル開発用
FROM base AS dev
EXPOSE 3000
CMD ["npm", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
RUN npm run format:check && npm run lint && npm run build

# CI: test with coverage (DATABASE_URL は実行時に渡す)
FROM base AS ci-test
COPY db/migrations ./db/migrations
ENV DRIZZLE_MIGRATIONS_DIR=./db/migrations
CMD ["npm", "run", "test:coverage"]

# 本番ビルド
FROM base AS build
RUN npm run build

# 本番実行用
FROM node:26-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --omit=dev --prefer-offline
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/schema.ts ./src/schema.ts
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY db/migrations ./db/migrations
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm install drizzle-kit --prefer-offline --no-save
EXPOSE 8080
CMD ["node", "dist/index.js"]
