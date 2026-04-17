import { eq, gte, and, sql } from 'drizzle-orm';
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
        .select({ count: sql<number>`count(*)::int` })
        .from(lineChannels)
        .where(eq(lineChannels.tenantId, tenantId));
      return r.count;
    }
    case 'forms': {
      const [r] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(forms)
        .where(eq(forms.tenantId, tenantId));
      return r.count;
    }
    case 'submissionsPerMonth': {
      const [r] = await db
        .select({ count: sql<number>`count(*)::int` })
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
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantMembers)
        .where(eq(tenantMembers.tenantId, tenantId));
      return r.count;
    }
  }
}

export async function checkQuota(
  tenantId: string,
  plan: string,
  resource: ResourceKey,
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = getPlanLimits(plan);
  const limit = limits[resource];
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await countResource(tenantId, resource);
  return { allowed: current < limit, current, limit };
}

export async function getTenantUsage(
  tenantId: string,
  plan: string,
): Promise<TenantUsage> {
  const limits = getPlanLimits(plan);
  const [channels, formCount, subs, members] = await Promise.all([
    countResource(tenantId, 'lineChannels'),
    countResource(tenantId, 'forms'),
    countResource(tenantId, 'submissionsPerMonth'),
    countResource(tenantId, 'members'),
  ]);
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
