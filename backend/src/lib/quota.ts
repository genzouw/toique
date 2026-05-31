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

function buildLineChannelsCountQuery(tenantId: string) {
  return db
    .select({ count: count() })
    .from(lineChannels)
    .where(eq(lineChannels.tenantId, tenantId));
}

function buildFormsCountQuery(tenantId: string) {
  return db
    .select({ count: count() })
    .from(forms)
    .where(eq(forms.tenantId, tenantId));
}

function buildSubmissionsCountQuery(tenantId: string) {
  return db
    .select({ count: count() })
    .from(submissions)
    .where(
      and(
        eq(submissions.tenantId, tenantId),
        gte(submissions.submittedAt, startOfCurrentMonth()),
      ),
    );
}

function buildMembersCountQuery(tenantId: string) {
  return db
    .select({ count: count() })
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));
}

async function countResource(
  tenantId: string,
  resource: ResourceKey,
): Promise<number> {
  switch (resource) {
    case 'lineChannels': {
      const [r] = await buildLineChannelsCountQuery(tenantId);
      return r.count;
    }
    case 'forms': {
      const [r] = await buildFormsCountQuery(tenantId);
      return r.count;
    }
    case 'submissionsPerMonth': {
      const [r] = await buildSubmissionsCountQuery(tenantId);
      return r.count;
    }
    case 'members': {
      const [r] = await buildMembersCountQuery(tenantId);
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

  // ⚡ Bolt: Use db.batch instead of Promise.all to execute multiple count queries
  // in a single database roundtrip, reducing network overhead and connection latency.
  const batchResults = await db.batch([
    buildLineChannelsCountQuery(tenantId),
    buildFormsCountQuery(tenantId),
    buildSubmissionsCountQuery(tenantId),
    buildMembersCountQuery(tenantId),
  ]);

  const [[channelsResult], [formsResult], [subsResult], [membersResult]] =
    batchResults;

  const channels = channelsResult?.count ?? 0;
  const formCount = formsResult?.count ?? 0;
  const subs = subsResult?.count ?? 0;
  const members = membersResult?.count ?? 0;

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
