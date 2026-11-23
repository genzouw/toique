import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';

// 検証は DB に触れる前に行われるため、認証だけを差し替えれば DB なしで 400 を確かめられる
vi.mock('../middleware/auth.js', () => ({
  requireAuth: async (
    c: { set: (k: string, v: unknown) => void },
    next: () => Promise<void>,
  ) => {
    c.set('authUser', { id: 'u', name: 'T' });
    await next();
  },
}));

const { default: formsRoute } = await import('./forms.js');
const { default: lineChannelsRoute } = await import('./line-channels.js');
const { default: onboardingRoute } = await import('./onboarding.js');

function buildApp() {
  const app = new Hono();
  app.use('*', async (c, next) => {
    c.set('tenant', {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'T',
      plan: 'free',
      role: 'admin',
      unlimited: false,
    });
    await next();
  });
  app.route('/forms', formsRoute);
  app.route('/line-channels', lineChannelsRoute);
  app.route('/onboarding', onboardingRoute);
  return app;
}

function send(method: string, path: string, body: string) {
  return buildApp().request(path, {
    method,
    headers: { 'content-type': 'application/json' },
    body,
  });
}

const FORM_ID = '00000000-0000-0000-0000-000000000002';

describe('リクエストボディの検証', () => {
  it('PATCH /forms/:id は許可値以外の status を 400 で弾く', async () => {
    const res = await send(
      'PATCH',
      `/forms/${FORM_ID}`,
      JSON.stringify({ status: 'foo' }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('status');
  });

  it('PATCH /forms/:id は空の name を 400 で弾く', async () => {
    const res = await send(
      'PATCH',
      `/forms/${FORM_ID}`,
      JSON.stringify({ name: '' }),
    );
    expect(res.status).toBe(400);
  });

  it('PATCH /forms/:id は文字列でない triggerKeyword を 400 で弾く', async () => {
    const res = await send(
      'PATCH',
      `/forms/${FORM_ID}`,
      JSON.stringify({ triggerKeyword: 1 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST /forms は UUID でない lineChannelId を 400 で弾く', async () => {
    const res = await send(
      'POST',
      '/forms',
      JSON.stringify({ name: 'n', lineChannelId: 'x', schema: {} }),
    );
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('lineChannelId');
  });

  it('POST /forms は必須項目の欠落を 400 で弾く', async () => {
    const res = await send('POST', '/forms', JSON.stringify({}));
    expect(res.status).toBe(400);
  });

  it('POST /line-channels は文字列でない項目を 400 で弾く', async () => {
    const res = await send(
      'POST',
      '/line-channels',
      JSON.stringify({
        channelId: 1,
        channelSecret: 's',
        channelAccessToken: 't',
        displayName: 'd',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('POST /onboarding は文字列でない tenantName を 400 で弾く', async () => {
    const res = await send(
      'POST',
      '/onboarding',
      JSON.stringify({ tenantName: 123 }),
    );
    expect(res.status).toBe(400);
  });

  it('POST /onboarding は上限を超える tenantName を 400 で弾く', async () => {
    const res = await send(
      'POST',
      '/onboarding',
      JSON.stringify({ tenantName: 'a'.repeat(101) }),
    );
    expect(res.status).toBe(400);
  });

  it('壊れた JSON は 500 ではなく 400 になる', async () => {
    const res = await send('POST', '/onboarding', '{broken');
    expect(res.status).toBe(400);
  });
});
