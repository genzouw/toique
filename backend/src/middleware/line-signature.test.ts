import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { lineSignature } from './line-signature.js';
import db from '../db.js';
import { lineChannels } from '../schema.js';
import { eq } from 'drizzle-orm';

const TEST_CHANNEL_ID = 'test-channel-1';
const TEST_SECRET = 'test-secret';

describe('lineSignature middleware', () => {
  beforeEach(async () => {
    await db
      .insert(lineChannels)
      .values({
        channelId: TEST_CHANNEL_ID,
        channelSecret: TEST_SECRET,
        channelAccessToken: 'token',
        displayName: 'Test',
        isActive: true,
      })
      .onConflictDoNothing();
  });

  afterEach(async () => {
    await db
      .delete(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
  });

  function buildApp() {
    const app = new Hono();
    app.post('/wh/:channelId', lineSignature, (c) => c.json({ ok: true }));
    return app;
  }

  it('returns 401 when signature header is missing', async () => {
    const app = buildApp();
    const res = await app.request(`/wh/${TEST_CHANNEL_ID}`, {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when channel does not exist', async () => {
    const app = buildApp();
    const body = '{}';
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('base64');
    const res = await app.request(`/wh/unknown-channel`, {
      method: 'POST',
      headers: { 'x-line-signature': sig },
      body,
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 when signature is invalid', async () => {
    const app = buildApp();
    const res = await app.request(`/wh/${TEST_CHANNEL_ID}`, {
      method: 'POST',
      headers: { 'x-line-signature': 'wrong' },
      body: '{}',
    });
    expect(res.status).toBe(401);
  });

  it('passes through with valid signature', async () => {
    const app = buildApp();
    const body = '{"events":[]}';
    const sig = createHmac('sha256', TEST_SECRET).update(body).digest('base64');
    const res = await app.request(`/wh/${TEST_CHANNEL_ID}`, {
      method: 'POST',
      headers: { 'x-line-signature': sig },
      body,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
