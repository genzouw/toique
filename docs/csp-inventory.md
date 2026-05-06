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

| 用途             | 接続先                                                                                                | 備考                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 自社 API         | `https://toique-backend-mbe63yj5aq-an.a.run.app`（`VITE_API_URL` の本番値、Cloud Run のサービス URL） | Better Auth `/api/auth/*` も同じオリジン。SPA とは別オリジンなので `'self'` では到達できない |
| Google Analytics | `https://*.google-analytics.com`                                                                      | GA4 のイベント送信                                                                           |
|                  | `https://*.analytics.google.com`                                                                      | （GA4 のリージョナル送信用）                                                                 |
|                  | `https://*.googletagmanager.com`                                                                      | gtag 設定取得                                                                                |

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
connect-src 'self' https://toique-backend-mbe63yj5aq-an.a.run.app https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com;
img-src 'self' data: https://*.google-analytics.com;
style-src 'self' 'unsafe-inline';
font-src 'self';
frame-ancestors 'none';
form-action 'self' https://checkout.stripe.com;
object-src 'none';
base-uri 'self';
```

> `style-src 'unsafe-inline'` は React の `style` 属性経由のスタイルを許可するため一旦許容。長期的には CSS-in-JS の見直しか `style-src-attr` 分離を検討。

> `report-uri` / `report-to` は当面省略し、ブラウザ DevTools のコンソールと Cloudflare Pages のログで違反を観測する。Sentry 連携や Cloudflare Pages Functions による CSP レポート集約は後続 PR で検討する（バックエンド Cloud Run の URL が動的なため、安定した受信先を別途用意する必要があるため）。

## 更新トリガー

以下の変更が入る PR では本ドキュメントの更新を必須とする。

- 新しい外部サービス連携の追加（CDN、SaaS、Webhook 受信等）
- 新しいインラインスクリプト・スタイルの追加
- フォーム送信先の追加・変更
- iframe 埋め込みの導入
