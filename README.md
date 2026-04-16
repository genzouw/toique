# Toique（トイク）

> LINE問い合わせ受付 SaaS

LINE公式アカウントを接続し、対話型フォームで問い合わせを受け付け、構造化データとして管理画面で確認できる SaaS。

## ドキュメント

- [設計書（2026-04-16）](docs/superpowers/specs/2026-04-16-toique-line-inquiry-saas-design.md)

## ステータス

設計ドラフト段階（打合せ前のたたき台）

## 想定スタック

- Backend: Hono + Drizzle ORM + PostgreSQL + better-auth
- Frontend: React 19 + Vite + Tailwind CSS 4 + @base-ui-components/react
- Infra: Docker Compose（開発）、Cloudflare R2（オブジェクトストレージ候補）

参考リポジトリ構造: [genzouw/ptasuku](https://github.com/genzouw/ptasuku)
