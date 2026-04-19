# Toique ロードマップ

> 最終更新: 2026-04-16

## 完了フェーズ

| フェーズ     | 内容                                                                | 計画書                                                                 |
| ------------ | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Phase 1**  | LINE連携基盤 (Webhook受信 + 署名検証 + DB保存 + オウム返し)         | [plan](superpowers/plans/2026-04-16-line-foundation-implementation.md) |
| **Phase 2b** | 管理画面・最小 (ダッシュボード / チャネル管理 / 受信メッセージ一覧) | [plan](superpowers/plans/2026-04-16-frontend-minimal-admin.md)         |
| **Phase 2a** | 認証 + マルチテナント (better-auth / tenants / tenant_members)      | [plan](superpowers/plans/2026-04-16-auth-multitenancy.md)              |
| **Phase 3**  | フォームエンジン (JSONスキーマ駆動対話型フォーム、submissions記録)  | [plan](superpowers/plans/2026-04-16-forms-engine.md)                   |
| **Infrastructure** | 本番ホスティング決定とCI/CDパイプライン (Cloud Run, Cloudflare Pages, GitHub Actions) | - |

---

## 残タスク

優先度は上から高い順。ブラウザでのフィードバックサイクルを回しながら着手する想定。

### 短期 (Phase 2.5 相当: オペレーター業務UIの補強)

- [ ] **問い合わせ詳細画面** (`/submissions/:id`)
  - 全回答フィールドの表示
  - ステータス変更 (new → in_review → done)
  - 担当者アサイン
- [ ] **受信メッセージ詳細**: 現在は一覧のみ。会話履歴形式で見られるように
- [ ] **手動返信機能**: 管理画面から LINE Push API でメッセージ送信
- [ ] **CSV エクスポート**: submissions を CSV でダウンロード
- [ ] **ページネーション / 検索**: submissions, messages, channels
- [ ] **監査ログ**: 誰がいつ何を変更したか (設計書 §9.4)

### 中期 (Phase 3.5 相当: フォーム機能拡張)

- [ ] **画像/ファイル回答ステップ**
  - `attachments` テーブル追加
  - LINE Content API で画像取得 → R2/S3 保存
  - 管理画面で画像サムネイル表示
- [ ] **バリデーション機能**
  - minLength / maxLength / pattern / required
  - スキーマでの明示指定 → エンジン側で検証 → 再質問
- [ ] **条件分岐の高度化**
  - choices[].next 以上の複雑な分岐 (switch / if-then)
  - 回答値に基づくスキップ
- [ ] **業種別フォームテンプレート集**
  - 買取査定 / 予約 / 会員登録 / 資料請求 などのサンプル
- [ ] **メール/Slack 通知**
  - 新規 submission 受信時の通知先設定
  - テナント別に設定可能
- [ ] **セッションタイムアウト対応**
  - 72h 経過した session の自動 abandoned 化 (cron/バッチ)
  - リマインドメッセージ

### 中長期 (Phase 4 以降)

- [ ] **ノーコードフォームビルダー UI**
  - ドラッグ&ドロップで質問フロー設計
  - JSONエディタの代替
- [ ] **複数テナント所属・切替** (現在は 1ユーザー=1テナント)
- [ ] **チーム招待機能** (`invitations` テーブル、招待メール送信)
- [ ] **オペレーターロール別の操作制限 UI**
  - admin / operator / viewer の差別化
- [ ] **パスワードリセット**
- [ ] **Webhook 外部連携**
  - 新規 submission を契約者の外部システムへ Webhook 通知
- [ ] **API 公開** (契約者がサーバから submissions を取得)
- [ ] **CRM 連携** (kintone / Salesforce / HubSpot)
- [ ] **複数LINEチャネル接続** (1テナント N チャネル、現在も実装上は可能だがUI未整備)

### セキュリティ / 運用

- [ ] **秘密情報暗号化**
  - `line_channels.channel_secret` / `channel_access_token` を pgcrypto で DB暗号化
  - エンタープライズ向けは AWS KMS envelope encryption
- [ ] **個人情報削除API**
  - LINE User ID 単位で全データ物理削除 (削除要求対応)
- [ ] **データ保持ポリシー**
  - テナント別に保持期間設定 (デフォルト3年)
  - 期限切れ session/submission の自動削除
- [ ] **レート制限**
  - Webhook以外のAPIに IP/ユーザー単位の制限
- [ ] **監視 / アラート**
  - エラーログ集約 (Sentry等)
  - 稼働率監視

### インフラ / 本番化

- [ ] **非同期処理のスケール化**
  - 現在 queueMicrotask → BullMQ (Redis) or Cloud Tasks に差し替え
- [ ] **課金・サブスク決済 (Stripe)**
  - プラン管理、利用量メトリクス
- [ ] **多言語対応** (ja/en)

---

## 既知の制限 (Phase 3 現時点)

- LINE Channel Secret / Access Token が DB に平文保存
- 認可は要認証のみ、ロール別制限は未実装
- フォームスキーマはJSONエディタで手入力 (ノーコードUIなし)
- 条件分岐は単純な choices[].next のみ
- 画像・ファイルの回答ステップ未対応
- オペレーターからの返信機能なし
- パスワードリセット機能なし
- Web版のみ (モバイルアプリなし)

---

## 参考

- 全体設計書: [2026-04-16 Toique設計](superpowers/specs/2026-04-16-toique-line-inquiry-saas-design.md)
