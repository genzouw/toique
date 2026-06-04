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
# oven/bun イメージに含まれる非 root 'bun' ユーザーで実行する (Trivy DS-0002 対応)。
# CI 用の ci-check ステージは vitest 等のキャッシュ書き込みに root 権限が必要なため
# 非 root 化しない。本番化された際は backend/Dockerfile 同様の production / USER bun
# ステージを別途追加する想定。
USER bun
EXPOSE 5173
# vite dev server (0.0.0.0:5173 で listen。`package.json` の `dev` が --host を付与し、
# `vite.config.ts` でも `server.host: true`) に対する HEALTHCHECK。
# busybox の wget で /index.html を叩くだけの軽量チェック。compose.yml の
# `depends_on: condition: service_healthy` で待てるようにすることと、Trivy DS-0026 対応を兼ねる。
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:5173/ || exit 1
CMD ["bun", "run", "dev"]

# CI: lint + format + build
FROM base AS ci-check
RUN bun run format:check && bun run lint && bun run test && bun run build
