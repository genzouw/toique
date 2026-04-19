import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from './line.js';
import * as eventHandler from '../../lib/line/event-handler.js';
import { Hono } from 'hono';

// Mock dependencies
vi.mock('../../middleware/line-signature.js', () => ({
  lineSignature: async (
    c: import('hono').Context,
    next: import('hono').Next,
  ) => {
    // Set a dummy channel to skip DB check
    c.set('lineChannel', { id: 'test-channel' });
    await next();
  },
}));

vi.mock('../../lib/line/event-handler.js', () => ({
  handleLineEvent: vi.fn(),
}));

describe('Line Webhook Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('processes multiple events concurrently', async () => {
    const handleLineEventSpy = vi.spyOn(eventHandler, 'handleLineEvent');

    // Simulate async processing
    let resolveFirstEvent!: (value: unknown) => void;
    const firstEventPromise = new Promise((resolve) => {
      resolveFirstEvent = resolve;
    });

    handleLineEventSpy.mockImplementation(async (channel, event) => {
      if ((event as { replyToken?: string }).replyToken === 'token-1') {
        await firstEventPromise;
      }
      return Promise.resolve();
    });

    // Create a wrapper Hono app because the router needs the param
    const testApp = new Hono();
    // Simulate setting rawBody which is done by lineSignature in reality, but we mocked it
    testApp.use('*', async (c, next) => {
      c.set(
        'rawBody' as never,
        JSON.stringify({
          events: [{ replyToken: 'token-1' }, { replyToken: 'token-2' }],
        }),
      );
      await next();
    });
    testApp.route('/webhooks/line', app);

    const res = await testApp.request('/webhooks/line/test-channel', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        events: [{ replyToken: 'token-1' }, { replyToken: 'token-2' }],
      }),
    });

    expect(res.status).toBe(200);

    // Both events should have started processing even though the first one is blocked
    await vi.waitFor(() => expect(handleLineEventSpy).toHaveBeenCalledTimes(2));

    resolveFirstEvent(undefined); // Clean up
  });
});
