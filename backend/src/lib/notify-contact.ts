import { logger } from './logger.js';
import { getMailer } from './mail/index.js';

/**
 * 問い合わせ受信時に運営者宛に通知メールを送る。
 *
 * 必須 env:
 *   MAIL_FROM (or 旧 CONTACT_FROM) - From アドレス
 *   OPERATOR_EMAILS               - 運営者メール (カンマ区切り)
 *   送信プロバイダ:
 *     - 本番: RESEND_API_KEY      → Resend を使う
 *     - ローカル: SMTP_HOST       → SMTP (Mailpit 等) を使う
 *
 * 運営者メールが空、もしくは Mailer が未構成 (env 不足) の場合は warn でスキップする。
 * (フォーム送信自体は DB 保存で成立させ、通知は best-effort)
 */
export async function notifyContact(input: {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  body: string;
  url: string | null;
  tenantName: string | null;
}): Promise<void> {
  const to = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (to.length === 0) {
    logger.warn('[notify-contact] skipped: OPERATOR_EMAILS is not set');
    return;
  }

  const mailer = getMailer();
  if (!mailer) {
    logger.warn(
      '[notify-contact] skipped: mailer is not configured (set RESEND_API_KEY/SMTP_HOST and MAIL_FROM)',
    );
    return;
  }

  const subject = `[Toique お問い合わせ] ${input.subject}`;
  const text = [
    `受付ID: ${input.id}`,
    `カテゴリ: ${input.category}`,
    `お名前: ${input.name}`,
    `メール: ${input.email}`,
    `テナント: ${input.tenantName ?? '(未ログイン or 未所属)'}`,
    input.url ? `関連URL: ${input.url}` : null,
    '',
    '--- 内容 ---',
    input.body,
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    await mailer.send({
      to,
      replyTo: input.email,
      subject,
      text,
    });
  } catch (err) {
    logger.error('[notify-contact] failed to send', err);
  }
}
