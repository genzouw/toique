# CSP リソース棚卸し

Toique で `Content-Security-Policy` (CSP) を導入するために、外部リソース・インラインスクリプト・通信先をまとめたインベントリ。CSP 設計時とポリシー更新時の参照ドキュメントとして使う。

関連 Issue: [#187](https://github.com/genzouw/toique/issues/187)

## 配信構成と CSP の効く場所

| レイヤ         | デプロイ先              | 役割             | CSP 設定箇所                               |
| -------------- | ----------------------- | ---------------- | ------------------------------------------ |
| バックエンド   | Cloud Run（Hono）       | API（JSON 返却） | `backend/src/index.ts` の `secureHeaders`  |
| フロントエンド | Cloudflare Pages（SPA） | HTML/JS/CSS 配信 | `frontend/public/_headers`（CSP の主戦場） |

CSP は document（HTML）の取得時にブラウザが評価する。Cloudflare Pages から返される HTML にこそ CSP が必要で、API（JSON）への CSP は限定的な保険として機能する。

## ディレクティブ別インベントリ

### `script-src`

| 種別             | 出所                                                      | 備考                                                                                                                                           |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 自前 JS          | Vite ビルド成果物 (`/assets/*.js`)                        | `'self'` で許可                                                                                                                                |
| Google Analytics | `https://www.googletagmanager.com/gtag/js`                | `frontend/index.html` から動的に `<script src>` 注入                                                                                           |
| インライン       | （旧）GA 初期化スクリプト                                 | 外部 JS 化済み、CSP 上は不要                                                                                                                   |
| JSON-LD          | `<script type="application/ld+json">`（`Landing.tsx` 他） | データブロックなので `script-src` の影響を受けない（modern browsers）。escape は `frontend/src/lib/json-ld.ts` の `safeJsonLdStringify` を使用 |

### `connect-src`

| 用途              | 接続先                                                      | 備考                                                                                                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 自社 SPA オリジン | `'self'`                                                    | SPA から自オリジンへの fetch（同一ホスト配信の静的アセット、将来の Pages Functions 等）の保険                                                                                                                                                                                          |
| 自社 API          | `VITE_API_URL` の origin（本番は Cloud Run のサービス URL） | Better Auth `/api/auth/*` を含む。SPA とは別オリジンなので `'self'` では到達できず明示が必要。`_headers` ではプレースホルダ `__VITE_API_ORIGIN__` を使用し、`frontend/scripts/inject-csp-api-origin.mjs` が post-build で実値に置換する（後述「CSP の `connect-src` テンプレ化」参照） |
| Google Analytics  | `https://*.google-analytics.com`                            | GA4 のイベント送信                                                                                                                                                                                                                                                                     |
|                   | `https://*.analytics.google.com`                            | （GA4 のリージョナル送信用）                                                                                                                                                                                                                                                           |
|                   | `https://*.googletagmanager.com`                            | gtag 設定取得                                                                                                                                                                                                                                                                          |

### `img-src`

| 用途                      | 出所                                                         | 備考                    |
| ------------------------- | ------------------------------------------------------------ | ----------------------- |
| 自前画像                  | `frontend/public/*` (`favicon`, `ogp`, `sns-icon`, `help/*`) | `'self'` で許可         |
| データ URI                | base64 等                                                    | `data:` を許可          |
| Google Analytics ピクセル | `https://*.google-analytics.com`                             | GA トラッキングピクセル |

### `style-src`

| 種別       | 出所                                | 備考                                                                      |
| ---------- | ----------------------------------- | ------------------------------------------------------------------------- |
| 自前 CSS   | Vite ビルド成果物 (`/assets/*.css`) | Tailwind のコンパイル済 CSS                                               |
| インライン | React 由来の `style` 属性           | `'unsafe-inline'` 許容を要検討（または `style-src-attr 'unsafe-inline'`） |

### `font-src`

| 用途         | 出所     | 備考                              |
| ------------ | -------- | --------------------------------- |
| 自前フォント | `'self'` | 外部フォント CDN は使用していない |

### `frame-src` / `frame-ancestors`

| 用途            | 設定     | 備考                                                         |
| --------------- | -------- | ------------------------------------------------------------ |
| iframe 埋め込み | （なし） | Stripe Checkout はリダイレクト方式のため不要                 |
| 埋め込まれ防止  | `'none'` | クリックジャッキング対策（`X-Frame-Options: DENY` と併用可） |

### `form-action`

| 用途            | 設定                          | 備考                            |
| --------------- | ----------------------------- | ------------------------------- |
| 内部フォーム    | `'self'`                      | お問い合わせ・サインアップ等    |
| Stripe Checkout | `https://checkout.stripe.com` | Stripe Hosted Checkout への遷移 |

### `object-src` / `base-uri` / `default-src`

| ディレクティブ | 設定     | 備考                                       |
| -------------- | -------- | ------------------------------------------ |
| `object-src`   | `'none'` | `<object>`/`<embed>` は使わない            |
| `base-uri`     | `'self'` | `<base>` タグ注入による迂回防止            |
| `default-src`  | `'self'` | 個別ディレクティブ未設定時のフォールバック |

## サーバ間通信（CSP 対象外、参考情報）

ブラウザの CSP は影響しないが、設計上把握しておく外部接続先。

| 機能     | 接続先                      | 呼び出し元                       |
| -------- | --------------------------- | -------------------------------- |
| Stripe   | `https://api.stripe.com`    | `backend/src/lib/stripe.ts`      |
| LINE     | `https://api.line.me`       | `backend/src/lib/line/client.ts` |
| Resend   | （`resend` パッケージ経由） | メール送信                       |
| Postgres | `DATABASE_URL`（Neon 等）   | `backend/src/db.ts`              |

## API 側 CSP（保守的設定）

バックエンドが返すのは JSON のみだが、エラー時の HTML レスポンスや将来の SSR 導入時の保険として最小限の CSP を設定する。

```
default-src 'none';
frame-ancestors 'none';
```

## 推奨ポリシー（出発点）

`Content-Security-Policy-Report-Only` で最初に試すポリシー。観測結果に応じて緩和・厳格化する。

```
default-src 'self';
script-src 'self' https://www.googletagmanager.com;
connect-src 'self' __VITE_API_ORIGIN__ https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
img-src 'self' data: https://*.google-analytics.com;
style-src 'self' 'unsafe-inline';
font-src 'self';
frame-ancestors 'none';
form-action 'self' https://checkout.stripe.com;
object-src 'none';
base-uri 'self';
```

> `style-src 'unsafe-inline'` は React の `style` 属性経由のスタイルを許可するため一旦許容。長期的には CSS-in-JS の見直しか `style-src-attr` 分離を検討。

> `__VITE_API_ORIGIN__` は `frontend/scripts/inject-csp-api-origin.mjs` が post-build で `process.env.VITE_API_URL` のオリジンに置換するプレースホルダ（後述「CSP の `connect-src` テンプレ化」参照）。

## CSP の `connect-src` テンプレ化（Issue #235）

PR #233 緊急復旧時に `frontend/public/_headers` の `connect-src` へ Cloud Run URL を直書きしたが、GCP プロジェクト移管・サービス名変更・リージョン移転で乖離する余地があるため、`.github/workflows/deploy.yml` で既に動的注入されている `VITE_API_URL` を CSP 側でも参照する形に変更した。

| 項目           | 値                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------- |
| プレースホルダ | `__VITE_API_ORIGIN__`（`frontend/public/_headers`）                                      |
| 置換スクリプト | `frontend/scripts/inject-csp-api-origin.mjs`（post-build で `dist/_headers` を書き換え） |
| 置換ロジック   | `new URL(process.env.VITE_API_URL).origin`                                               |
| フォールバック | `VITE_API_URL` 未設定時は `http://localhost:3000`（CI test build / ローカル用）          |
| 異常時の挙動   | URL 不正 / プレースホルダ未検出は `exit 1`                                               |
| 連結ポイント   | `frontend/package.json` の `build` スクリプト末尾                                        |

中長期的にはバックエンドにカスタムドメイン（例: `api.toique.genzouw.com`）を割り当て、`_headers` をカスタムドメインで固定する案を別 Issue で追跡する。その時点で本スクリプトは撤去予定。

## CSP レポート受信エンドポイント

Issue [#234](https://github.com/genzouw/toique/issues/234) で観測経路を強化し、`report-uri` / `report-to` 双方を有効化した。受信先は Cloudflare Pages 同一オリジンに常設している（バックエンド Cloud Run の URL は動的でディレクティブから安定して指せないため、Pages Functions の固定パスに集約している）。

| 項目              | 値 / パス                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| エンドポイント    | `POST /api/csp-report`（Cloudflare Pages Functions、SPA と同一オリジン）                                            |
| 実装              | `frontend/functions/api/csp-report.ts`                                                                              |
| 受信 Content-Type | `application/csp-report` / `application/reports+json` / `application/json`                                          |
| 上限              | body 8KB、超過時 `413`。未対応 Content-Type は `415`                                                                |
| ストレージ        | 当面なし。`console.log` 経由で Cloudflare のログに 1 行 JSON で出力                                                 |
| `_headers` 側設定 | `Reporting-Endpoints: csp-endpoint="/api/csp-report"` + CSP の `report-uri /api/csp-report; report-to csp-endpoint` |

### ログ閲覧手順

1. Cloudflare Dashboard → Pages → 対象プロジェクト → Functions → Real-time logs
2. `type":"csp-report"` で grep（Logpush 導入時は R2 上のログでも同様に検索可能）

### CI 上の CSP 違反検知（公開ページ巡回）

Issue #234 の対応方針 (2) として、Cloudflare Pages 配信下の本番同等環境を CI でも再現し、公開ページの主要画面を自動巡回することで違反を検知する。

| 項目           | 値 / パス                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| ジョブ         | `.github/workflows/ci.yml` の `frontend-e2e`                                                                                                          |
| ランナー       | `wrangler pages dev frontend/dist`（`_headers` と Pages Functions を本番同等で動作させるため）                                                        |
| テストランナー | Playwright (Chromium 単体)                                                                                                                            |
| テスト定義     | `frontend/e2e/csp-smoke.spec.ts`                                                                                                                      |
| 対象 URL       | 未認証で到達可能な公開ページ（`/`, `/login`, `/signup`, `/pricing`, `/help`, `/faq`, `/contact`, `/specified-commercial-transactions`, `/for/salon`） |
| 失敗条件       | (a) `Refused to ...` / `Content Security Policy` を含むコンソールメッセージ、(b) `/api/csp-report` への POST、(c) 未捕捉 JS 例外                      |
| 意図的に許容   | バックエンド Cloud Run への接続失敗（CI 環境では到達できないため、CSP 関連エラーのみフィルタしている）                                                |
| Scope OUT      | 認証必要画面（Dashboard 等）、Stripe Checkout への外部遷移、UI 操作テスト。Cloudflare Pages の実プレビューデプロイ後の巡回も別 PR で検討              |

### レポート集約のスケールアップ余地

`console.log` ベースは閲覧頻度が低い前提の最小構成。違反の継続発生が確認できたら以下を段階的に検討する。

- Cloudflare Logpush + R2（低コストの長期保管）
- Cloudflare D1 への永続化（クエリで集計したい場合）
- Sentry / 外部 SIEM への転送（アラート連携が必要になった場合）

### 運用条項

- enforce は維持したまま `report-to` のみ追加するカナリア観測を 1〜2 週間実施し、継続的に違反が出るオリジンが見つかった場合は本ファイルと `_headers` を併せて更新する。
- 新しい外部サービス連携・インラインスクリプト・フォーム送信先を追加する PR では、本ファイルの更新を必須とする（後述の「更新トリガー」参照）。

## 更新トリガー

以下の変更が入る PR では本ドキュメントの更新を必須とする。

- 新しい外部サービス連携の追加（CDN、SaaS、Webhook 受信等）
- 新しいインラインスクリプト・スタイルの追加
- フォーム送信先の追加・変更
- iframe 埋め込みの導入
