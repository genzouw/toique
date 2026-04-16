import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import { lineChannels, inboundMessages, tenants } from '../schema.js';
import messagesRoute from './messages.js';

let tenantId: string;
let otherTenantId: string;
let channelRowId: string;
let otherChannelRowId: string;

function buildApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('tenant', {
      id: tenantId,
      name: 'Test Tenant',
      plan: 'free',
      role: 'admin',
    });
    c.set('authUser', {
      id: '00000000-0000-0000-0000-000000000000',
      email: 't@t.test',
      name: 'Test',
    });
    await next();
  });
  app.route('/api/v1/messages', messagesRoute);
  return app;
}

describe('messages route', () => {
  beforeEach(async () => {
    const [t1] = await db
      .insert(tenants)
      .values({ name: 'Msg Test T1' })
      .returning({ id: tenants.id });
    const [t2] = await db
      .insert(tenants)
      .values({ name: 'Msg Test T2' })
      .returning({ id: tenants.id });
    tenantId = t1.id;
    otherTenantId = t2.id;

    const [c1] = await db
      .insert(lineChannels)
      .values({
        tenantId,
        channelId: 'msg-test-ch1',
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Msg Test',
      })
      .returning({ id: lineChannels.id });
    channelRowId = c1.id;

    const [c2] = await db
      .insert(lineChannels)
      .values({
        tenantId: otherTenantId,
        channelId: 'msg-test-ch2',
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'Msg Test Other',
      })
      .returning({ id: lineChannels.id });
    otherChannelRowId = c2.id;
  });

  afterEach(async () => {
    await db.delete(tenants).where(eq(tenants.id, tenantId));
    await db.delete(tenants).where(eq(tenants.id, otherTenantId));
  });

  it('GET /api/v1/messages returns rows for current tenant only, ordered desc', async () => {
    // current tenant messages
    await db.insert(inboundMessages).values([
      {
        lineChannelId: channelRowId,
        eventType: 'message',
        messageType: 'text',
        text: 'first',
        rawEvent: { type: 'message' } as Record<string, unknown>,
        receivedAt: new Date('2026-04-15T10:00:00Z'),
      },
      {
        lineChannelId: channelRowId,
        eventType: 'message',
        messageType: 'text',
        text: 'second',
        rawEvent: { type: 'message' } as Record<string, unknown>,
        receivedAt: new Date('2026-04-16T10:00:00Z'),
      },
    ]);
    // other tenant's message (should be hidden)
    await db.insert(inboundMessages).values({
      lineChannelId: otherChannelRowId,
      eventType: 'message',
      messageType: 'text',
      text: 'other-tenant-message',
      rawEvent: { type: 'message' } as Record<string, unknown>,
      receivedAt: new Date('2026-04-20T10:00:00Z'),
    });

    const app = buildApp();
    const res = await app.request('/api/v1/messages');
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ text: string }>;
    expect(body).toHaveLength(2);
    expect(body.some((m) => m.text === 'other-tenant-message')).toBe(false);
    expect(body[0].text).toBe('second'); // desc: 新しい順
    expect(body[1].text).toBe('first');
  });
});
