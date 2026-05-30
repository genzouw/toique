import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db.js', () => {
  const dbMock = {
    select: vi.fn(),
    batch: vi.fn((queries: unknown[]) => Promise.all(queries)),
  };
  return { default: dbMock };
});

import db from '../db.js';
import { lineChannels, forms, submissions, tenantMembers } from '../schema.js';
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
  // テーブルごとに異なる count 値を返すことで、実装側でクエリを取り違えても
  // テストが検知できるようにする。呼び出し順序ではなく from(table) の引数で
  // 識別するため、同じクエリを誤って重複指定したケースもFAILとして拾える。
  const COUNT_BY_TABLE = new Map<unknown, number>([
    [lineChannels, 3],
    [forms, 5],
    [submissions, 11],
    [tenantMembers, 2],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    const from = vi.fn((table: unknown) => {
      const value = COUNT_BY_TABLE.get(table) ?? -1;
      return { where: vi.fn().mockResolvedValue([{ count: value }]) };
    });
    vi.mocked(db.select).mockReturnValue({
      from,
    } as unknown as ReturnType<typeof db.select>);
  });

  it('reports actual current values but reports limit as -1 (unlimited)', async () => {
    const usage = await getTenantUsage('tenant-id', 'free', {
      unlimited: true,
    });
    expect(usage).toEqual({
      lineChannels: { current: 3, limit: -1 },
      forms: { current: 5, limit: -1 },
      submissionsPerMonth: { current: 11, limit: -1 },
      members: { current: 2, limit: -1 },
    });
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.select).toHaveBeenCalledTimes(4);
  });

  it('reports plan-derived limits when unlimited is false', async () => {
    const usage = await getTenantUsage('tenant-id', 'pro', {
      unlimited: false,
    });
    expect(usage.lineChannels.current).toBe(3);
    expect(usage.forms.current).toBe(5);
    expect(usage.submissionsPerMonth.current).toBe(11);
    expect(usage.members.current).toBe(2);
    expect(usage.forms.limit).toBe(-1);
    expect(usage.lineChannels.limit).toBe(5);
    expect(usage.submissionsPerMonth.limit).toBe(3000);
    expect(usage.members.limit).toBe(5);
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(db.select).toHaveBeenCalledTimes(4);
  });
});
