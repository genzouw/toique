# フォームエンジン 実装計画 (Phase 3)

**Goal:** LINEユーザーからのキーワード送信をきっかけに、JSON で定義した質問フローに沿って対話形式で回答を収集し、完了後に submission として記録する機能を追加する。管理画面で forms の作成/編集、submissions 閲覧が可能。

**Architecture:** backend の `event-handler` を拡張し、「アクティブセッションあり」なら forms engine に委譲、なければ trigger_keyword でセッション開始。フォーム定義は `forms.schema` (JSONB)、進行状態は `line_sessions`、完了データは `submissions` に保存。管理画面はまずJSONエディタベースでフォームを編集。ノーコードビルダーは Phase 3.5 で対応。

**Tech Stack:**

- backend: 既存 (Hono + Drizzle + better-auth)
- frontend: 既存 (React 19 + Tailwind)

---

## データモデル追加

```
forms            id, tenant_id, line_channel_id, name, status,
                 trigger_keyword, schema(jsonb), version,
                 created_at, updated_at
                 UNIQUE(line_channel_id, trigger_keyword) WHERE status='published'

line_sessions    id, line_user_id, form_id, current_step,
                 answers(jsonb), status, started_at, updated_at, expires_at
                 UNIQUE(line_user_id, form_id)

submissions      id, tenant_id, form_id, line_user_id,
                 answers(jsonb), status, submitted_at
```

`tenant_id` を submissions に直接持つことで tenant スコープクエリを簡略化。

---

## フォームスキーマ (JSON)

最小スコープ: `choice` / `text` / `end`。条件分岐は直列 `next` のみ。

```json
{
  "startStep": "category",
  "steps": {
    "category": {
      "type": "choice",
      "prompt": "査定希望カテゴリを選んでください",
      "field": "category",
      "choices": [
        { "label": "時計", "value": "watch", "next": "brand" },
        { "label": "バッグ", "value": "bag", "next": "brand" }
      ]
    },
    "brand": {
      "type": "text",
      "prompt": "ブランド名を入力してください",
      "field": "brand",
      "next": "customer_name"
    },
    "customer_name": {
      "type": "text",
      "prompt": "お名前をフルネームで入力してください",
      "field": "customer_name",
      "next": "complete"
    },
    "complete": {
      "type": "end",
      "thanks": "ありがとうございました。担当者よりご連絡いたします。"
    }
  }
}
```

---

## Task A: スキーマ追加

**Files:** `backend/src/schema.ts`, 新マイグレーション

- [ ] `forms`, `line_sessions`, `submissions` を schema.ts に追加
- [ ] `db:generate` → `db:migrate`
- [ ] コミット `feat: add forms, line_sessions, submissions schema`

---

## Task B: forms 管理 API

**Files:** `backend/src/routes/forms.ts`, `backend/src/routes/submissions.ts`, `src/index.ts`

- [ ] `routes/forms.ts`: GET (一覧) / POST (作成) / PATCH /:id (更新) / DELETE /:id
  - tenant スコープ必須
  - schema(JSON) の最低限検証（startStep の存在）
- [ ] `routes/submissions.ts`: GET (一覧)
- [ ] index.ts にマウント (requireTenant)
- [ ] コミット `feat: add forms and submissions management API`

---

## Task C: フォーム進行エンジン

**Files:** `backend/src/lib/forms/engine.ts`, `backend/src/lib/forms/messages.ts`, テスト

- [ ] `messages.ts`: step → LINE reply messages (choice→QuickReply, text→プレーン, end→thanks)
- [ ] `engine.ts`:
  - `startSession(channel, lineUser, form)` : session 作成、first step prompt を返す
  - `advanceSession(session, form, userInput)` :
    - 現 step に応じた回答解釈
    - answers に記録
    - next step 算出
    - status 更新 / 完了時 submission 作成
    - 次 step の LINE reply messages を返す
- [ ] ユニットテスト (DB付)
- [ ] コミット `feat: add forms engine with choice/text/end support`

---

## Task D: event-handler 統合

**Files:** `backend/src/lib/line/event-handler.ts`, テスト更新

- [ ] message / postback イベント時に:
  1. アクティブセッション (line_user_id × status='in_progress') を検索
  2. あり → forms engine に渡して次 step に進める
  3. なし → trigger_keyword にマッチする forms を検索
  4. マッチ → startSession
  5. 不一致 → 既存のオウム返し (Phase 1 挙動を維持)
- [ ] Quick Reply の postback は `event.postback.data` を value として解釈
- [ ] テスト追加 (フォームトリガ / 途中回答 / 完了)
- [ ] コミット `feat: integrate forms engine into event handler`

---

## Task E: frontend フォーム管理画面

**Files:** `frontend/src/pages/Forms.tsx`, `frontend/src/pages/FormEdit.tsx`, `frontend/src/lib/api.ts`, ルーティング追加

- [ ] `api.ts` に forms / submissions クライアントを追加
- [ ] `Forms.tsx`: 一覧、作成ボタン
- [ ] `FormEdit.tsx`: 表示名、trigger_keyword、line_channel 選択、JSONエディタ (`<textarea>` で十分)、保存/削除/Publish切替
- [ ] Layout ナビに「フォーム」追加
- [ ] App.tsx にルート追加
- [ ] コミット `feat: add form management UI (JSON editor)`

---

## Task F: frontend submissions 一覧

**Files:** `frontend/src/pages/Submissions.tsx`, `frontend/src/lib/api.ts`, ルーティング

- [ ] `api.listSubmissions()` 追加
- [ ] `Submissions.tsx`: 一覧テーブル (フォーム名、受信日時、ステータス、回答サマリ)
- [ ] Layout ナビに「問い合わせ」追加
- [ ] コミット `feat: add submissions list page`

---

## Task G: 動作確認 + README

- [ ] docker compose up -d --build
- [ ] UI からフォーム作成
- [ ] backend に curl で LINEイベント POST (サイン付き) 送ってエンド to エンド確認
- [ ] README 更新
- [ ] コミット `docs: document forms engine flow`

---

## 意図的な後回し (Phase 3.5+ で対応)

- 画像/ファイル回答 step (attachments テーブル)
- バリデーション (minLength, pattern, required 等の明示指定)
- 条件分岐 (choices[].next 以上の複雑な分岐)
- フォームテンプレート集
- ノーコード UI ビルダー
- Push API fallback
- セッションタイムアウト再送
