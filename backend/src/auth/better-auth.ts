import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import db from '../db.js';
import * as schema from '../schema.js';

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'dev-only-secret-replace-in-production-min-32-chars',
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
  },
  // Drizzle schema のテーブル名は複数形のため明示的に map
  user: { modelName: 'users' },
  session: { modelName: 'sessions' },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verifications' },
});

export type Auth = typeof auth;
