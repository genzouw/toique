import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import { lineChannels, tenants } from '../schema.js';
import lineChannelsRoute from './line-channels.js';

const TEST_CHANNEL_ID = 'crud-test-channel';
let tenantId: string;

function buildApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('tenant', {
      id: tenantId,
      name: 'Test Tenant',
      plan: 'free',
      role: 'admin',
      unlimited: false,
    });
    c.set('authUser', {
      id: '00000000-0000-0000-0000-000000000000',
      email: 't@t.test',
      name: 'Test',
    });
    await next();
  });
  app.route('/api/v1/line-channels', lineChannelsRoute);
  return app;
}

describe('line-channels routes', () => {
  beforeEach(async () => {
    const [t] = await db
      .insert(tenants)
      .values({ name: 'Test Tenant' })
      .returning({ id: tenants.id });
    tenantId = t.id;
  });

  afterEach(async () => {
    // cascade で line_channels も消える
    await db.delete(tenants).where(eq(tenants.id, tenantId));
  });

  it('POST creates a channel scoped to tenant', async () => {
    const app = buildApp();
    const res = await app.request('/api/v1/line-channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Test Brand',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.channelId).toBe(TEST_CHANNEL_ID);
    expect(body.tenantId).toBe(tenantId);
    expect(body).not.toHaveProperty('channelSecret');
    expect(body).not.toHaveProperty('channelAccessToken');
  });

  it('GET returns only channels for the current tenant', async () => {
    const app = buildApp();
    await app.request('/api/v1/line-channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Test Brand',
      }),
    });
    const res = await app.request('/api/v1/line-channels');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<Record<string, unknown>>;
    expect(body.length).toBe(1);
    expect(body[0].channelId).toBe(TEST_CHANNEL_ID);
    expect(body[0].tenantId).toBe(tenantId);
    expect(body[0]).not.toHaveProperty('channelSecret');
    expect(body[0]).not.toHaveProperty('channelAccessToken');
  });

  it('DELETE removes a channel by id', async () => {
    const app = buildApp();
    const created = await app.request('/api/v1/line-channels', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        channelId: TEST_CHANNEL_ID,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Test Brand',
      }),
    });
    const { id } = (await created.json()) as { id: string };
    const del = await app.request(`/api/v1/line-channels/${id}`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(204);

    const remaining = await db
      .select()
      .from(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
    expect(remaining).toHaveLength(0);
  });
});
