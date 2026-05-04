import { describe, it, expect } from 'vitest';
import {
  PLAN_LIMITS,
  PLAN_LABELS,
  PLAN_PRICES,
  getPlanLimits,
} from './plan-config.js';

describe('plan-config', () => {
  it('PLAN_LIMITS has expected values for free and pro', () => {
    expect(PLAN_LIMITS.free).toEqual({
      lineChannels: 1,
      forms: 3,
      submissionsPerMonth: 100,
      members: 1,
    });
    expect(PLAN_LIMITS.pro).toEqual({
      lineChannels: 5,
      forms: -1,
      submissionsPerMonth: 3000,
      members: 5,
    });
  });

  it('PLAN_LABELS contains human-readable labels', () => {
    expect(PLAN_LABELS.free).toBe('Free');
    expect(PLAN_LABELS.pro).toBe('Pro');
  });

  it('PLAN_PRICES are numeric and pro is non-zero', () => {
    expect(PLAN_PRICES.free).toBe(0);
    expect(PLAN_PRICES.pro).toBeGreaterThan(0);
  });

  describe('getPlanLimits', () => {
    it('returns the matching plan limits for a known plan id', () => {
      expect(getPlanLimits('pro')).toBe(PLAN_LIMITS.pro);
      expect(getPlanLimits('free')).toBe(PLAN_LIMITS.free);
    });

    it('falls back to free limits for an unknown plan id', () => {
      expect(getPlanLimits('enterprise')).toBe(PLAN_LIMITS.free);
      expect(getPlanLimits('')).toBe(PLAN_LIMITS.free);
    });
  });
});
