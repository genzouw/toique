FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# ローカル開発用
FROM base AS dev
EXPOSE 3000
CMD ["npm", "run", "dev"]

# CI: test with coverage (DATABASE_URL は実行時に渡す)
FROM base AS ci-test
CMD ["npm", "run", "test:coverage"]
