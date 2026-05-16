// CORS_ORIGIN はカンマ区切りで複数のフロントエンドオリジンを指定可能。
// - allowedOrigins: 全要素を Hono の cors() と Better Auth の trustedOrigins に渡す
// - frontendUrl: 先頭をフロント正規 URL として、メール本文や Stripe リダイレクト先に利用する
const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';

export const allowedOrigins: readonly string[] = raw
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const frontendUrl: string = allowedOrigins[0];
