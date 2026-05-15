# ビルドコンテキスト: リポジトリルート
FROM oven/bun:alpine AS base
WORKDIR /app
COPY frontend/package.json frontend/bun.lock ./
RUN --mount=type=cache,target=/root/.bun,sharing=locked bun install --frozen-lockfile
COPY frontend/ .
COPY .prettierrc .

# ローカル開発用
FROM base AS dev
EXPOSE 5173
CMD ["bun", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
RUN bun run format:check && bun run lint && bun run test && bun run build
