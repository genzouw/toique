import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import db from '../db.js';
import { users, sessions, accounts, verifications } from '../schema.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [process.env.CORS_ORIGIN || 'http://localhost:5173'],
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret:
    process.env.BETTER_AUTH_SECRET ||
    'dev-only-secret-replace-in-production-min-32-chars',
});

export type Auth = typeof auth;
