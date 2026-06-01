import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import db from '../db.js';
import * as schema from '../schema.js';
import { getMailer } from '../lib/mail/index.js';
import { logger } from '../lib/logger.js';
import { allowedOrigins, frontendUrl } from '../lib/frontend-origin.js';

function getAuthSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;

  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.NODE_ENV !== 'test'
  ) {
    throw new Error(
      `BETTER_AUTH_SECRET environment variable must be set when NODE_ENV is not "development" or "test" (current: ${process.env.NODE_ENV})`,
    );
  }
  return 'dev-only-secret-replace-in-production-min-32-chars';
}

async function sendAuthEmail(input: {
  to: string;
  subject: string;
  text: string;
}) {
  const mailer = getMailer();
  if (!mailer) {
    logger.warn(
      `[auth-email] skipped (mailer not configured): ${input.subject} -> ${input.to}`,
    );
    return;
  }
  try {
    await mailer.send({
      to: [input.to],
      subject: input.subject,
      text: input.text,
    });
  } catch (err) {
    logger.error('[auth-email] failed to send', err);
    throw err;
  }
}

// メール本文の検証/リセット用リンクは、ユーザーがフロントエンドのドメインから踏む形にする。
// フロント側の /verify-email・/reset-password ページが受けて、backend の API を呼び出す。
const FRONTEND_URL = frontendUrl;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: getAuthSecret(),
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // メール検証完了までログイン不可にする (検証メール送信後は autoSignIn しない)
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, token }) => {
      const url = `${FRONTEND_URL}/reset-password?token=${token}`;
      await sendAuthEmail({
        to: user.email,
        subject: '[Toique] パスワード再設定のご案内',
        text: [
          `${user.name ?? ''}様`,
          '',
          'パスワード再設定のリクエストを受け付けました。',
          '以下のリンクから新しいパスワードを設定してください (1時間有効):',
          '',
          url,
          '',
          'このメールにお心当たりがない場合は破棄してください。',
        ].join('\n'),
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, token }) => {
      const url = `${FRONTEND_URL}/verify-email?token=${token}`;
      await sendAuthEmail({
        to: user.email,
        subject: '[Toique] メールアドレスの確認',
        text: [
          `${user.name ?? ''}様`,
          '',
          'Toique にご登録いただきありがとうございます。',
          '以下のリンクをクリックしてメールアドレスを確認してください:',
          '',
          url,
          '',
          'このメールにお心当たりがない場合は破棄してください。',
        ].join('\n'),
      });
    },
  },
  trustedOrigins: [...allowedOrigins],
  advanced: {
    database: {
      // PostgreSQL の gen_random_uuid() default に任せる (schema 側で uuid 型使用のため)
      generateId: false,
    },
    // 本番環境（同一親ドメインのサブドメイン間共有）では Lax を使用しセキュリティを強化
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === 'production',
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
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
