import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import db from '../db.js';
import { lineChannels } from '../schema.js';
import lineChannelsRoute from './line-channels.js';

const TEST_CHANNEL_ID = 'crud-test-channel';

describe('line-channels routes', () => {
  beforeEach(async () => {
    await db
      .delete(lineChannels)
      .where(eq(lineChannels.channelId, TEST_CHANNEL_ID));
  });

  function buildApp() {
    const app = new Hono();
    app.route('/api/v1/line-channels', lineChannelsRoute);
    return app;
  }

  it('POST creates a channel', async () => {
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
    const body = (await res.json()) as { channelId: string };
    expect(body.channelId).toBe(TEST_CHANNEL_ID);
  });

  it('GET returns a list including the created channel', async () => {
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
    const body = (await res.json()) as Array<{ channelId: string }>;
    expect(body.some((c) => c.channelId === TEST_CHANNEL_ID)).toBe(true);
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
