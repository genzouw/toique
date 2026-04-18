import { Resend } from 'resend';

/**
 * 問い合わせ受信時に運営者宛に通知メールを送る。
 *
 * 必須 env:
 *   RESEND_API_KEY   - Resend API キー
 *   CONTACT_FROM     - From アドレス (例: "Toique <noreply@toique.dev>")
 *   OPERATOR_EMAILS  - 運営者メール (カンマ区切り)
 *
 * いずれかが未設定の場合はエラーを throw せず warn でスキップする。
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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM;
  const to = (process.env.OPERATOR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey || !from || to.length === 0) {
    console.warn(
      '[notify-contact] skipped: RESEND_API_KEY / CONTACT_FROM / OPERATOR_EMAILS いずれかが未設定',
    );
    return;
  }

  const resend = new Resend(apiKey);
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
    await resend.emails.send({
      from,
      to,
      replyTo: input.email,
      subject,
      text,
    });
  } catch (err) {
    console.error('[notify-contact] failed to send', err);
  }
}
