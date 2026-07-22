import { eq } from 'drizzle-orm';
import db from '../db.js';
import { tenantMembers, users } from '../schema.js';

/**
 * Stripe による課金なしで Pro 相当として扱う、運営ドッグフーディング用のメールアドレス。
 * 本番環境で運営自身がプロダクトを利用しながら検証するための例外口。
 *
 * 値は `DOGFOODING_EMAILS` 環境変数 (カンマ区切り) から取得する。
 * 未設定または空の場合は dogfooding 機能が無効化され、`isDogfoodingEmail` は
 * 常に false を返す。
 *
 * Public 化したリポジトリでハードコードを避けるための実装で、本番用の email は
 * GitHub Actions Secrets で管理して Cloud Run env として渡す。
 */
let cachedDogfoodingEmailsRaw: string | undefined;
let cachedDogfoodingEmailSet: ReadonlySet<string> = new Set();

function getDogfoodingEmailSet(): ReadonlySet<string> {
  const raw = process.env.DOGFOODING_EMAILS ?? '';
  if (raw === cachedDogfoodingEmailsRaw) {
    return cachedDogfoodingEmailSet;
  }

  cachedDogfoodingEmailsRaw = raw;
  cachedDogfoodingEmailSet = new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return cachedDogfoodingEmailSet;
}

export function isDogfoodingEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getDogfoodingEmailSet().has(email.trim().toLowerCase());
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
