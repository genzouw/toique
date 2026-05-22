# ビルドコンテキスト: リポジトリルート
#
# 用途: ローカル開発 (dev) と CI チェック (ci-check) のみ。
# 本番配信は Cloudflare Pages を利用しており、Docker イメージとしてはデプロイしない
# ため production ステージは設けていない。本番化が必要になった場合は backend/Dockerfile
# 同様に production / USER bun ステージを追加する想定。
#
# Bun バージョンは backend/Dockerfile および `.github/workflows/deploy.yml` の
# `setup-bun` と揃える。
FROM oven/bun:1.3.14-alpine AS base
WORKDIR /app
COPY frontend/package.json frontend/bun.lock ./
RUN --mount=type=cache,target=/root/.bun,sharing=locked bun install --frozen-lockfile
COPY frontend/ .
COPY .prettierrc .

# ローカル開発用
FROM base AS dev
# oven/bun イメージに含まれる非 root ユーザー。Docker のベストプラクティスに沿い
# コンテナ実行時の権限を最小化する (Trivy DS-0002 対応)。
USER bun
EXPOSE 5173
CMD ["bun", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
USER bun
RUN bun run format:check && bun run lint && bun run test && bun run build
