import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import db from '../db.js';
import * as schema from '../schema.js';

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'BETTER_AUTH_SECRET environment variable is required in production',
      );
    }
    return 'dev-only-secret-replace-in-production-min-32-chars';
  }
  return secret;
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: getAuthSecret(),
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  trustedOrigins: [process.env.CORS_ORIGIN || 'http://localhost:5173'],
  advanced: {
    database: {
      // PostgreSQL の gen_random_uuid() default に任せる (schema 側で uuid 型使用のため)
      generateId: false,
    },
    // フロントエンド(pages.dev)とバックエンド(fly.dev)が異なるドメインのため
    // クロスオリジンでCookieを送受信できるよう設定
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
    },
  },
  // Drizzle schema のテーブル名は複数形のため明示的に map
  user: { modelName: 'users' },
  session: { modelName: 'sessions' },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verifications' },
});

export type Auth = typeof auth;
