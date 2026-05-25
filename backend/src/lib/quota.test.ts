import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db.js', () => {
  const dbMock = {
    select: vi.fn(),
    batch: vi.fn(),
  };
  return { default: dbMock };
});

import db from '../db.js';
import { checkQuota, getTenantUsage } from './quota.js';

describe('checkQuota with unlimited option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns allowed without touching the database when unlimited is true', async () => {
    const result = await checkQuota('tenant-id', 'free', 'lineChannels', {
      unlimited: true,
    });
    expect(result).toEqual({ allowed: true, current: 0, limit: -1 });
    expect(db.select).not.toHaveBeenCalled();
  });

  it('still consults the plan limits when unlimited is false', async () => {
    const where = vi
      .fn()
      .mockResolvedValue([{ count: 0 }] as Awaited<ReturnType<typeof where>>);
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(db.select).mockReturnValue({
      from,
    } as unknown as ReturnType<typeof db.select>);

    const result = await checkQuota('tenant-id', 'free', 'lineChannels', {
      unlimited: false,
    });
    expect(result).toEqual({ allowed: true, current: 0, limit: 1 });
    expect(db.select).toHaveBeenCalled();
  });
});

describe('getTenantUsage with unlimited option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const where = vi.fn().mockReturnValue('mocked-query');
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(db.select).mockReturnValue({
      from,
    } as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.batch).mockResolvedValue([
      [{ count: 7 }],
      [{ count: 7 }],
      [{ count: 7 }],
      [{ count: 7 }],
    ] as unknown as ReturnType<typeof db.batch>);
  });

  it('reports actual current values but reports limit as -1 (unlimited)', async () => {
    const usage = await getTenantUsage('tenant-id', 'free', {
      unlimited: true,
    });
    expect(usage).toEqual({
      lineChannels: { current: 7, limit: -1 },
      forms: { current: 7, limit: -1 },
      submissionsPerMonth: { current: 7, limit: -1 },
      members: { current: 7, limit: -1 },
    });
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.batch).toHaveBeenCalledWith([
      'mocked-query',
      'mocked-query',
      'mocked-query',
      'mocked-query',
    ]);
  });

  it('reports plan-derived limits when unlimited is false', async () => {
    const usage = await getTenantUsage('tenant-id', 'pro', {
      unlimited: false,
    });
    expect(usage.forms.limit).toBe(-1);
    expect(usage.lineChannels.limit).toBe(5);
    expect(usage.submissionsPerMonth.limit).toBe(3000);
    expect(usage.members.limit).toBe(5);
    expect(db.batch).toHaveBeenCalledTimes(1);
  });
});
