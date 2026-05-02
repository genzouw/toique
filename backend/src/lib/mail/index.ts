import { logger } from '../logger.js';
import { ResendAdapter } from './resend-adapter.js';
import { SmtpAdapter } from './smtp-adapter.js';
import type { MailAdapter } from './types.js';

export type { MailAdapter, MailMessage } from './types.js';

export type MailDriver = 'resend' | 'smtp' | 'noop';

/**
 * env から MailAdapter を構築する。
 *
 * 優先順位:
 *   1. MAIL_DRIVER=resend|smtp の明示
 *   2. RESEND_API_KEY があれば resend
 *   3. SMTP_HOST があれば smtp
 *   4. いずれもなければ null (= 送信スキップ)
 *
 * 共通 env:
 *   MAIL_FROM      - 既定の From アドレス。未指定時は CONTACT_FROM をフォールバック
 *
 * driver=resend の必須 env:
 *   RESEND_API_KEY
 *
 * driver=smtp の必須 env:
 *   SMTP_HOST
 *   SMTP_PORT       (default: 1025)
 *   SMTP_USER       (任意)
 *   SMTP_PASS       (任意)
 *   SMTP_SECURE     ('true' で TLS)
 */
export function createMailerFromEnv(): MailAdapter | null {
  const explicit = (process.env.MAIL_DRIVER || undefined) as
    | MailDriver
    | undefined;
  const driver = explicit ?? inferDriver();
  const defaultFrom = process.env.MAIL_FROM || process.env.CONTACT_FROM || '';

  if (driver === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !defaultFrom) {
      logger.warn(
        '[mail] resend driver selected but RESEND_API_KEY / MAIL_FROM is missing; mail sending disabled',
      );
      return null;
    }
    return new ResendAdapter({ apiKey, defaultFrom });
  }

  if (driver === 'smtp') {
    const host = process.env.SMTP_HOST;
    if (!host || !defaultFrom) {
      logger.warn(
        '[mail] smtp driver selected but SMTP_HOST / MAIL_FROM is missing; mail sending disabled',
      );
      return null;
    }
    const port = parseInt(process.env.SMTP_PORT || '1025', 10) || 1025;
    return new SmtpAdapter({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      defaultFrom,
    });
  }

  return null;
}

function inferDriver(): MailDriver {
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_HOST) return 'smtp';
  return 'noop';
}

let cached: MailAdapter | null | undefined;

/**
 * プロセス内シングルトンの MailAdapter を返す。null は「送信不可（env 不足）」を意味する。
 * テストで env を切り替えたい場合は resetMailerCache() を呼ぶこと。
 */
export function getMailer(): MailAdapter | null {
  if (cached === undefined) {
    cached = createMailerFromEnv();
  }
  return cached;
}

export function resetMailerCache(): void {
  cached = undefined;
}
