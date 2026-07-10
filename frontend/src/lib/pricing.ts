/**
 * フロントエンドで参照する料金プランの定数とフォーマッタ。
 *
 * `PLAN_PRICES` の数値は `backend/src/lib/plan-config.ts` の `PLAN_PRICES` と
 * 必ず一致させること。乖離するとマーケUI上の表示金額と実際の請求金額に
 * 矛盾が生じる。
 */
export type PlanId = 'free' | 'pro';

export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  pro: 2980,
};

// ⚡ Bolt: Cache Intl.NumberFormat instance to avoid costly re-initialization on every function call.
// This significantly reduces overhead when formatting prices frequently during renders (e.g. iterating over lists).
const formatter = new Intl.NumberFormat('ja-JP');

/**
 * マーケUI向け表記。例: `¥2,980`
 */
export function formatPriceWithSymbol(amount: number): string {
  return `¥${formatter.format(amount)}`;
}

/**
 * 法的記載向け表記。例: `2,980円`
 * 税込/税抜の明示は呼び出し側で結合する。
 */
export function formatPriceWithUnit(amount: number): string {
  return `${formatter.format(amount)}円`;
}
