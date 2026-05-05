import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenantMembers, users } from '../schema.js';

/**
 * Stripe による課金なしで Pro 相当として扱う、運営ドッグフーディング用のメールアドレス。
 * 本番環境で運営自身がプロダクトを利用しながら検証するための例外口。
 */
export const DOGFOODING_EMAILS: readonly string[] = [
  'toique.official@gmail.com',
];

const NORMALIZED_DOGFOODING_EMAILS: ReadonlySet<string> = new Set(
  DOGFOODING_EMAILS.map((e) => e.trim().toLowerCase()),
);

export function isDogfoodingEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return NORMALIZED_DOGFOODING_EMAILS.has(email.trim().toLowerCase());
}

/**
 * テナントに紐づく何れかのメンバーがドッグフーディング用メールであれば true。
 * Webhook など、認証ユーザーのメールが取得できない経路で呼び出すために使う。
 */
export async function isDogfoodingTenant(tenantId: string): Promise<boolean> {
  const rows = await db
    .select({ email: users.email })
    .from(tenantMembers)
    .innerJoin(users, eq(users.id, tenantMembers.userId))
    .where(eq(tenantMembers.tenantId, tenantId));
  return rows.some((r) => isDogfoodingEmail(r.email));
}
