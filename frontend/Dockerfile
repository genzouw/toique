FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# ローカル開発用
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]
