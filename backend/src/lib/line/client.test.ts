import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { replyMessage, pushMessage } from './client.js';

describe('replyMessage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the LINE reply endpoint with bearer token and JSON body', async () => {
    await replyMessage({
      accessToken: 'test-token',
      replyToken: 'reply-abc',
      messages: [{ type: 'text', text: 'hello' }],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.line.me/v2/bot/message/reply');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer test-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.replyToken).toBe('reply-abc');
    expect(body.messages).toEqual([{ type: 'text', text: 'hello' }]);
  });

  it('throws when LINE API returns a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Unauthorized', { status: 401 })),
    );

    await expect(
      replyMessage({
        accessToken: 'bad',
        replyToken: 'reply-abc',
        messages: [{ type: 'text', text: 'hello' }],
      }),
    ).rejects.toThrow(/401/);
  });
});

describe('pushMessage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the LINE push endpoint with bearer token and JSON body', async () => {
    await pushMessage({
      accessToken: 'push-token',
      to: 'U1234',
      messages: [{ type: 'text', text: 'hi' }],
    });

    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.line.me/v2/bot/message/push');
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer push-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(init.body);
    expect(body.to).toBe('U1234');
    expect(body.messages).toEqual([{ type: 'text', text: 'hi' }]);
  });

  it('throws when LINE API returns a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Forbidden', { status: 403 })),
    );

    await expect(
      pushMessage({
        accessToken: 'bad',
        to: 'U1234',
        messages: [{ type: 'text', text: 'hi' }],
      }),
    ).rejects.toThrow(/LINE push failed: 403/);
  });
});
