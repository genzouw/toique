# ビルドコンテキスト: リポジトリルート
FROM node:22-alpine AS base
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked npm ci --prefer-offline
COPY frontend/ .
COPY .prettierrc .

# ローカル開発用
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
RUN npm run format:check && npm run lint && npm run test && npm run build
