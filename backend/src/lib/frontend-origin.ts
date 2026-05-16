// CORS_ORIGIN はカンマ区切りで複数のフロントエンドオリジンを指定可能。
// - allowedOrigins: 全要素を Hono の cors() と Better Auth の trustedOrigins に渡す
// - frontendUrl: 先頭をフロント正規 URL として、メール本文や Stripe リダイレクト先に利用する
//
// 末尾スラッシュは URL 構築時の二重スラッシュを避けるため除去する。
// CORS_ORIGIN が空・カンマだけ等で解析結果が空になる場合はデフォルトにフォールバックし、
// frontendUrl が undefined になるのを防ぐ。
const DEFAULT_FRONTEND_URL = 'http://localhost:5173';

const parsed = (process.env.CORS_ORIGIN || DEFAULT_FRONTEND_URL)
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

export const allowedOrigins: readonly string[] =
  parsed.length > 0 ? parsed : [DEFAULT_FRONTEND_URL];

export const frontendUrl: string = allowedOrigins[0];
