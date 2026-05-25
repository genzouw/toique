import { eq, gte, and, count } from 'drizzle-orm';
import db from '../db.js';
import { lineChannels, forms, submissions, tenantMembers } from '../schema.js';
import { getPlanLimits } from './plan-config.js';

export type ResourceUsage = { current: number; limit: number };

export type TenantUsage = {
  lineChannels: ResourceUsage;
  forms: ResourceUsage;
  submissionsPerMonth: ResourceUsage;
  members: ResourceUsage;
};

type ResourceKey = keyof TenantUsage;

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function countResource(
  tenantId: string,
  resource: ResourceKey,
): Promise<number> {
  switch (resource) {
    case 'lineChannels': {
      const [r] = await db
        .select({ count: count() })
        .from(lineChannels)
        .where(eq(lineChannels.tenantId, tenantId));
      return r.count;
    }
    case 'forms': {
      const [r] = await db
        .select({ count: count() })
        .from(forms)
        .where(eq(forms.tenantId, tenantId));
      return r.count;
    }
    case 'submissionsPerMonth': {
      const [r] = await db
        .select({ count: count() })
        .from(submissions)
        .where(
          and(
            eq(submissions.tenantId, tenantId),
            gte(submissions.submittedAt, startOfCurrentMonth()),
          ),
        );
      return r.count;
    }
    case 'members': {
      const [r] = await db
        .select({ count: count() })
        .from(tenantMembers)
        .where(eq(tenantMembers.tenantId, tenantId));
      return r.count;
    }
  }
}

export type QuotaOptions = {
  /** true の場合は計測をスキップしてすべて allowed として扱う (運営ドッグフーディング用) */
  unlimited?: boolean;
};

export async function checkQuota(
  tenantId: string,
  plan: string,
  resource: ResourceKey,
  options?: QuotaOptions,
): Promise<{ allowed: boolean; current: number; limit: number }> {
  if (options?.unlimited) return { allowed: true, current: 0, limit: -1 };

  const limits = getPlanLimits(plan);
  const limit = limits[resource];
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await countResource(tenantId, resource);
  return { allowed: current < limit, current, limit };
}

export async function getTenantUsage(
  tenantId: string,
  plan: string,
  options?: QuotaOptions,
): Promise<TenantUsage> {
  const limits = getPlanLimits(plan);

  // ⚡ Bolt: Use db.batch() to execute all count queries in a single roundtrip
  const batchResults = await db.batch([
    db
      .select({ count: count() })
      .from(lineChannels)
      .where(eq(lineChannels.tenantId, tenantId)),
    db
      .select({ count: count() })
      .from(forms)
      .where(eq(forms.tenantId, tenantId)),
    db
      .select({ count: count() })
      .from(submissions)
      .where(
        and(
          eq(submissions.tenantId, tenantId),
          gte(submissions.submittedAt, startOfCurrentMonth()),
        ),
      ),
    db
      .select({ count: count() })
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenantId)),
  ]);

  const channels = batchResults[0][0]?.count ?? 0;
  const formCount = batchResults[1][0]?.count ?? 0;
  const subs = batchResults[2][0]?.count ?? 0;
  const members = batchResults[3][0]?.count ?? 0;

  if (options?.unlimited) {
    return {
      lineChannels: { current: channels, limit: -1 },
      forms: { current: formCount, limit: -1 },
      submissionsPerMonth: { current: subs, limit: -1 },
      members: { current: members, limit: -1 },
    };
  }
  return {
    lineChannels: { current: channels, limit: limits.lineChannels },
    forms: { current: formCount, limit: limits.forms },
    submissionsPerMonth: {
      current: subs,
      limit: limits.submissionsPerMonth,
    },
    members: { current: members, limit: limits.members },
  };
}
