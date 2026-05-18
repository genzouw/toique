import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { requireAuth, requireTenant } from './auth.js';
import { auth } from '../auth/better-auth.js';
import db from '../db.js';

type SessionResult = Awaited<ReturnType<typeof auth.api.getSession>>;

vi.mock('../auth/better-auth.js', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('../db.js', () => ({
  default: {
    select: vi.fn(),
  },
}));

function mockTenantQuery(
  row:
    | {
        tenantId: string;
        role: string;
        tenantName: string;
        tenantPlan: string;
      }
    | undefined,
) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = vi.fn().mockReturnValue({ limit });
  const innerJoin = vi.fn().mockReturnValue({ where });
  const from = vi.fn().mockReturnValue({ innerJoin });
  vi.mocked(db.select).mockReturnValue({
    from,
  } as unknown as ReturnType<typeof db.select>);
}

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

  async function loadIsOperatorEmail(operatorEmails: string) {
    vi.stubEnv('OPERATOR_EMAILS', operatorEmails);
    const { isOperatorEmail } = await import('./auth.js');
    return isOperatorEmail;
  }

  it('returns true if email is in OPERATOR_EMAILS', async () => {
    const isOperatorEmail = await loadIsOperatorEmail(
      'admin@example.com,test@example.com',
    );
    expect(isOperatorEmail('admin@example.com')).toBe(true);
    expect(isOperatorEmail('test@example.com')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', async () => {
    const isOperatorEmail = await loadIsOperatorEmail(
      ' admin@EXAMPLE.com ,  test@example.com',
    );
    expect(isOperatorEmail('ADMIN@example.com')).toBe(true);
    expect(isOperatorEmail('  test@example.com  ')).toBe(true);
  });

  it('returns false for unknown emails', async () => {
    const isOperatorEmail = await loadIsOperatorEmail('admin@example.com');
    expect(isOperatorEmail('unknown@example.com')).toBe(false);
  });

  it('returns false for null, undefined, or empty string', async () => {
    const isOperatorEmail = await loadIsOperatorEmail('admin@example.com');
    expect(isOperatorEmail(null)).toBe(false);
    expect(isOperatorEmail(undefined)).toBe(false);
    expect(isOperatorEmail('')).toBe(false);
  });

  it('handles empty OPERATOR_EMAILS gracefully', async () => {
    const isOperatorEmail = await loadIsOperatorEmail('');
    expect(isOperatorEmail('admin@example.com')).toBe(false);
  });
});

describe('requireTenant middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // dogfooding 判定は DOGFOODING_EMAILS env に依存するため、テストでは安定した値を stub する。
    vi.stubEnv('DOGFOODING_EMAILS', 'dummy@example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function buildApp() {
    const app = new Hono();
    app.get('/test', requireTenant, (c) => {
      return c.json(c.get('tenant'));
    });
    return app;
  }

  it('preserves the DB plan and sets unlimited=false for normal users', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'normal@example.com',
        name: 'Normal',
      },
    } as unknown as SessionResult);
    mockTenantQuery({
      tenantId: 'tenant-1',
      role: 'admin',
      tenantName: 'Acme',
      tenantPlan: 'free',
    });

    const res = await buildApp().request('/test');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: 'tenant-1',
      name: 'Acme',
      plan: 'free',
      role: 'admin',
      unlimited: false,
    });
  });

  it('overrides plan to "pro" and sets unlimited=true for the dogfooding email', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'user-2',
        email: 'dummy@example.com',
        name: 'Toique Official',
      },
    } as unknown as SessionResult);
    mockTenantQuery({
      tenantId: 'tenant-2',
      role: 'admin',
      tenantName: 'Toique Internal',
      tenantPlan: 'free',
    });

    const res = await buildApp().request('/test');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: 'tenant-2',
      name: 'Toique Internal',
      plan: 'pro',
      role: 'admin',
      unlimited: true,
    });
  });

  it('returns 403 when no tenant membership is found', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: {
        id: 'user-3',
        email: 'orphan@example.com',
        name: 'Orphan',
      },
    } as unknown as SessionResult);
    mockTenantQuery(undefined);

    const res = await buildApp().request('/test');
    expect(res.status).toBe(403);
  });
});
