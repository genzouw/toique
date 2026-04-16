# 認証 + マルチテナント 実装計画 (Phase 2a)

**Goal:** better-auth による Email+Password 認証を導入し、ユーザーごとにテナントを持つマルチテナント構造にする。管理 API は認証必須・テナントスコープ強制。Webhook は引き続き公開 (署名検証のみ)。

**Architecture:** backend に better-auth + `tenants` / `tenant_members` テーブル追加。`line_channels` / `inbound_messages` などを `tenant_id` でスコープ化。フロントに login/signup/onboarding ページを追加し、未ログイン時は `/login` にリダイレクト。Phase 2a では **1ユーザー = 1テナント** に単純化（将来は複数所属可）。

**Tech Stack:**

- better-auth 1.6 (Email+Password)
- Drizzle ORM スキーマ拡張
- Hono middleware
- React Router: 認証ガード

---

## データモデル追加

```
users (better-auth)
sessions (better-auth)
accounts (better-auth)
verifications (better-auth)

tenants                  id, name, plan, created_at
tenant_members           id, tenant_id, user_id(unique), role, created_at
line_channels            既存 + tenant_id
```

- `tenant_members.user_id` に UNIQUE 制約で「1ユーザー = 1テナント」を担保
- `line_channels.tenant_id` は NOT NULL (既存データは移行時に 1つのテナントに寄せる or 削除)
- `inbound_messages` は `line_channels` 経由で tenant に紐付くため、新規カラム不要

---

## Task A: backend スキーマ拡張

**Files:**

- Modify: `backend/src/schema.ts`
- Create: 新マイグレーション

- [ ] **A.1: schema.ts に better-auth テーブル + tenants + tenant_members 追加、line_channels に tenant_id 追加**

- [ ] **A.2: `npm run db:generate` でマイグレーション生成**

- [ ] **A.3: 既存 line_channels データは開発中なので `TRUNCATE` → 新マイグレーション適用**

- [ ] **A.4: `docker exec toique-db-1 psql` でテーブル確認**

- [ ] **A.5: コミット** `feat: add auth tables, tenants, and tenant_id on line_channels`

---

## Task B: better-auth 設定

**Files:**

- Create: `backend/src/auth/better-auth.ts`
- Modify: `backend/package.json` (better-auth 追加)
- Modify: `backend/src/index.ts` (ハンドラマウント)

- [ ] **B.1: better-auth と関連依存を npm install**
- [ ] **B.2: `backend/src/auth/better-auth.ts` を作成**
- [ ] **B.3: `src/index.ts` に `/api/auth/*` ハンドラマウント**
- [ ] **B.4: コミット** `feat: wire up better-auth email/password`

---

## Task C: 認証ミドルウェア

**Files:**

- Create: `backend/src/middleware/auth.ts`

- [ ] **C.1: `requireAuth` / `requireTenant` ミドルウェア**
  - `requireAuth`: sessions からユーザーを取得し、未認証なら 401
  - `requireTenant`: requireAuth + tenant_members から tenant を取得、未登録なら 403
- [ ] **C.2: コミット** `feat: add auth and tenant middlewares`

---

## Task D: Onboarding API

**Files:**

- Create: `backend/src/routes/onboarding.ts`

- [ ] **D.1: `POST /api/v1/onboarding` で tenant + tenant_member(role=admin) を作成**
- [ ] **D.2: `src/index.ts` にマウント (requireAuth 必須、tenant 不要)**
- [ ] **D.3: コミット** `feat: add onboarding endpoint to provision tenant`

---

## Task E: 既存ルートのテナントスコープ化

**Files:**

- Modify: `backend/src/routes/line-channels.ts`
- Modify: `backend/src/routes/messages.ts`
- Modify: 対応するテスト

- [ ] **E.1: line-channels を `requireTenant` 必須にし、`tenant_id` でフィルタ/挿入**
- [ ] **E.2: messages を `requireTenant` 必須にし、`line_channels` 経由で tenant スコープ**
- [ ] **E.3: テストをテナント作成 + セッション付与で通るよう修正**
- [ ] **E.4: 全テスト PASS を確認**
- [ ] **E.5: コミット** `feat: scope line-channels and messages by tenant`

---

## Task F: frontend — better-auth client + login/signup

**Files:**

- Modify: `frontend/package.json` (better-auth 追加)
- Create: `frontend/src/lib/auth-client.ts`
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Signup.tsx`
- Create: `frontend/src/pages/Onboarding.tsx`
- Modify: `frontend/src/App.tsx` (ルーティングとガード追加)
- Modify: `frontend/src/components/Layout.tsx` (ログアウトボタン + ユーザー表示)

- [ ] **F.1: npm install better-auth**
- [ ] **F.2: auth-client 作成**
- [ ] **F.3: Login ページ**
- [ ] **F.4: Signup ページ**
- [ ] **F.5: Onboarding ページ (テナント名入力)**
- [ ] **F.6: App.tsx に `/login` `/signup` `/onboarding` を追加、認証ガード追加**
- [ ] **F.7: Layout にログアウト + ユーザー表示**
- [ ] **F.8: コミット** `feat: add auth flow to admin UI`

---

## Task G: 動作確認 + README 更新

- [ ] **G.1: docker compose up で再起動**
- [ ] **G.2: ブラウザで `/signup` → onboarding → dashboard → チャネル登録**
- [ ] **G.3: README に認証フロー追記**
- [ ] **G.4: コミット** `docs: document auth and onboarding flow`

---

## 意図的な後回し (Phase 2a スコープ外)

- 複数テナント所属・切替
- invitations（チーム招待）
- secret/token の DB 暗号化 (別タスク)
- ロール別の操作制限 UI
- パスワードリセット
