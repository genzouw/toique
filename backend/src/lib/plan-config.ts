export type PlanId = 'free' | 'pro';

export type PlanLimits = {
  lineChannels: number; // -1 = unlimited
  forms: number;
  submissionsPerMonth: number;
  members: number;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { lineChannels: 1, forms: 3, submissionsPerMonth: 100, members: 1 },
  pro: { lineChannels: 5, forms: -1, submissionsPerMonth: 3000, members: 5 },
};

export const PLAN_LABELS: Record<PlanId, string> = {
  free: 'Free',
  pro: 'Pro',
};

export const PLAN_PRICES: Record<PlanId, number> = {
  free: 0,
  pro: 2980,
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanId] ?? PLAN_LIMITS.free;
}
