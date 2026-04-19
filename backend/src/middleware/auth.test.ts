import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { requireAuth } from './auth.js';
import { auth } from '../auth/better-auth.js';

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

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
    expect(auth.api.getSession).toHaveBeenCalledWith({
      headers: expect.any(Headers),
    });
  });

  it('returns 401 when session exists but user is null', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: null,
    } as unknown as SessionResult);
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
      role: 'admin',
    };
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: mockUser,
    } as unknown as SessionResult);

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
    expect(body.user).not.toHaveProperty('role');
  });
});

describe('isOperatorEmail', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true if email is in OPERATOR_EMAILS', async () => {
    vi.stubEnv('OPERATOR_EMAILS', 'admin@example.com,test@example.com');
    const { isOperatorEmail } = await import('./auth.js');
    expect(isOperatorEmail('admin@example.com')).toBe(true);
    expect(isOperatorEmail('test@example.com')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', async () => {
    vi.stubEnv('OPERATOR_EMAILS', ' admin@EXAMPLE.com ,  test@example.com');
    const { isOperatorEmail } = await import('./auth.js');
    expect(isOperatorEmail('ADMIN@example.com')).toBe(true);
    expect(isOperatorEmail('  test@example.com  ')).toBe(true);
  });

  it('returns false for unknown emails', async () => {
    vi.stubEnv('OPERATOR_EMAILS', 'admin@example.com');
    const { isOperatorEmail } = await import('./auth.js');
    expect(isOperatorEmail('unknown@example.com')).toBe(false);
  });

  it('returns false for null, undefined, or empty string', async () => {
    vi.stubEnv('OPERATOR_EMAILS', 'admin@example.com');
    const { isOperatorEmail } = await import('./auth.js');
    expect(isOperatorEmail(null)).toBe(false);
    expect(isOperatorEmail(undefined)).toBe(false);
    expect(isOperatorEmail('')).toBe(false);
  });

  it('handles empty OPERATOR_EMAILS gracefully', async () => {
    vi.stubEnv('OPERATOR_EMAILS', '');
    const { isOperatorEmail } = await import('./auth.js');
    expect(isOperatorEmail('admin@example.com')).toBe(false);
  });
});
