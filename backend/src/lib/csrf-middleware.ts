import type { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { allowedOrigins } from './frontend-origin.js';

/**
 * `/api/*` 配下に CSRF 保護を適用する。
 *
 * Origin ヘッダを `allowedOrigins` (CORS_ORIGIN) と照合し、自社フロントエンド
 * 以外からの state-changing リクエスト (POST/PUT/DELETE/PATCH) を reject する。
 * GET/HEAD/OPTIONS は CSRF の対象外。
 *
 * 適用範囲についての注意:
 * - `/api/v1/contact` は「公開フォーム」だが、自社フロントエンドからのみ POST
 *   される設計のため、この CSRF 保護が適用される（=外部サイトからの直接 POST
 *   は reject される）。レート制限・ハニーポットと CSRF Origin チェックの
 *   3 層で守る形になる。
 * - `/api/auth/*` (Better Auth handler) も `/api/*` 配下に該当する。
 *   Better Auth も内部で Origin / trustedOrigins チェックを持つ可能性があるが、
 *   両者とも同じ `allowedOrigins` を参照するため整合する想定。
 */
export function applyCsrfMiddleware(app: Hono): void {
  app.use(
    '/api/*',
    csrf({
      origin: (origin) => allowedOrigins.includes(origin),
    }),
  );
}
