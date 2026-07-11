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

// globally cached formatter to avoid expensive re-initializations
const numberFormatter = new Intl.NumberFormat('ja-JP');

/**
 * マーケUI向け表記。例: `¥2,980`
 */
export function formatPriceWithSymbol(amount: number): string {
  return `¥${numberFormatter.format(amount)}`;
}

/**
 * 法的記載向け表記。例: `2,980円`
 * 税込/税抜の明示は呼び出し側で結合する。
 */
export function formatPriceWithUnit(amount: number): string {
  return `${numberFormatter.format(amount)}円`;
}
