import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../../db.js';
import { users, tenants, tenantMembers } from '../../schema.js';
import adminUsersRoute from './users.js';

function buildApp() {
  const app = new Hono();
  app.route('/api/v1/admin/users', adminUsersRoute);
  return app;
}

describe('admin users route', () => {
  const createdUserIds: string[] = [];
  const createdTenantIds: string[] = [];

  beforeEach(() => {
    createdUserIds.length = 0;
    createdTenantIds.length = 0;
  });

  afterEach(async () => {
    if (createdTenantIds.length > 0) {
      await db.delete(tenants).where(inArray(tenants.id, createdTenantIds));
    }
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds));
    }
  });

  it('GET /api/v1/admin/users returns users with tenant info, desc by createdAt', async () => {
    const [t] = await db
      .insert(tenants)
      .values({ name: 'Admin Users Test Tenant', plan: 'free' })
      .returning({ id: tenants.id });
    createdTenantIds.push(t.id);

    const [u1] = await db
      .insert(users)
      .values({
        name: 'Older User',
        email: `older-${Date.now()}@test.local`,
        emailVerified: true,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      })
      .returning({ id: users.id });
    const [u2] = await db
      .insert(users)
      .values({
        name: 'Newer User',
        email: `newer-${Date.now()}@test.local`,
        emailVerified: false,
        createdAt: new Date('2026-04-01T00:00:00Z'),
      })
      .returning({ id: users.id });
    createdUserIds.push(u1.id, u2.id);

    await db.insert(tenantMembers).values({
      tenantId: t.id,
      userId: u1.id,
      role: 'admin',
    });

    const app = buildApp();
    const res = await app.request('/api/v1/admin/users');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      id: string;
      name: string;
      email: string;
      tenantId: string | null;
      tenantName: string | null;
      tenantPlan: string | null;
      tenantRole: string | null;
      createdAt: string;
    }>;

    const rowsOfTest = body.filter((r) => createdUserIds.includes(r.id));
    expect(rowsOfTest).toHaveLength(2);
    // desc: Newer が先
    const newerIndex = rowsOfTest.findIndex((r) => r.id === u2.id);
    const olderIndex = rowsOfTest.findIndex((r) => r.id === u1.id);
    expect(newerIndex).toBeLessThan(olderIndex);

    const newer = rowsOfTest[newerIndex];
    expect(newer.tenantId).toBeNull();
    expect(newer.tenantName).toBeNull();
    expect(newer.tenantRole).toBeNull();

    const older = rowsOfTest[olderIndex];
    expect(older.tenantId).toBe(t.id);
    expect(older.tenantName).toBe('Admin Users Test Tenant');
    expect(older.tenantPlan).toBe('free');
    expect(older.tenantRole).toBe('admin');
  });

  it('GET /api/v1/admin/users/:id returns detail with tenant info', async () => {
    const [t] = await db
      .insert(tenants)
      .values({ name: 'Detail Test Tenant', plan: 'pro' })
      .returning({ id: tenants.id });
    createdTenantIds.push(t.id);

    const [u] = await db
      .insert(users)
      .values({
        name: 'Detail User',
        email: `detail-${Date.now()}@test.local`,
        emailVerified: true,
      })
      .returning({ id: users.id });
    createdUserIds.push(u.id);

    await db.insert(tenantMembers).values({
      tenantId: t.id,
      userId: u.id,
      role: 'operator',
    });

    const app = buildApp();
    const res = await app.request(`/api/v1/admin/users/${u.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      id: string;
      name: string;
      email: string;
      tenantId: string | null;
      tenantName: string | null;
      tenantPlan: string | null;
      tenantRole: string | null;
    };
    expect(body.id).toBe(u.id);
    expect(body.name).toBe('Detail User');
    expect(body.tenantId).toBe(t.id);
    expect(body.tenantName).toBe('Detail Test Tenant');
    expect(body.tenantPlan).toBe('pro');
    expect(body.tenantRole).toBe('operator');
  });

  it('GET /api/v1/admin/users/:id returns 404 for unknown id', async () => {
    const app = buildApp();
    const res = await app.request(
      '/api/v1/admin/users/00000000-0000-0000-0000-000000000000',
    );
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/admin/users returns 200 even when user has no tenant', async () => {
    const [u] = await db
      .insert(users)
      .values({
        name: 'Lone User',
        email: `lone-${Date.now()}@test.local`,
      })
      .returning({ id: users.id });
    createdUserIds.push(u.id);

    const app = buildApp();
    const res = await app.request('/api/v1/admin/users');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string }>;
    expect(body.some((r) => r.id === u.id)).toBe(true);

    // クリーンアップは afterEach で行う
    // テスト DB 汚染を避けるため users から削除
    await db.delete(users).where(eq(users.id, u.id));
    createdUserIds.splice(createdUserIds.indexOf(u.id), 1);
  });
});
