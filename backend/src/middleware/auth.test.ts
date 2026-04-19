import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { requireAuth } from './auth.js';
import { auth } from '../auth/better-auth.js';

vi.mock('../auth/better-auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function buildApp() {
    const app = new Hono();
    app.get('/test', requireAuth, (c) => {
      const user = c.get('authUser');
      return c.json({ ok: true, user });
    });
    return app;
  }

  it('returns 401 when session is null', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);
    const app = buildApp();
    const res = await app.request('/test');
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Unauthorized');
  });

  it('returns 401 when session exists but user is null', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: null } as any);
    const app = buildApp();
    const res = await app.request('/test');
    expect(res.status).toBe(401);
    expect(await res.text()).toBe('Unauthorized');
  });

  it('sets authUser and calls next when valid session exists', async () => {
    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    };
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: mockUser } as any);

    const app = buildApp();
    const res = await app.request('/test');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });
});
