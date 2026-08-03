import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { isOperatorEmail, requireAuth, requireTenant } from './auth.js';
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true if email is in OPERATOR_EMAILS', () => {
    vi.stubEnv('OPERATOR_EMAILS', 'admin@example.com,test@example.com');
    expect(isOperatorEmail('admin@example.com')).toBe(true);
    expect(isOperatorEmail('test@example.com')).toBe(true);
  });

  it('is case-insensitive and trims whitespace', () => {
    vi.stubEnv('OPERATOR_EMAILS', ' admin@EXAMPLE.com ,  test@example.com');
    expect(isOperatorEmail('ADMIN@example.com')).toBe(true);
    expect(isOperatorEmail('  test@example.com  ')).toBe(true);
  });

  it('returns false for unknown emails', () => {
    vi.stubEnv('OPERATOR_EMAILS', 'admin@example.com');
    expect(isOperatorEmail('unknown@example.com')).toBe(false);
  });

  it('returns false for null, undefined, or empty string', () => {
    vi.stubEnv('OPERATOR_EMAILS', 'admin@example.com');
    expect(isOperatorEmail(null)).toBe(false);
    expect(isOperatorEmail(undefined)).toBe(false);
    expect(isOperatorEmail('')).toBe(false);
  });

  it('handles empty OPERATOR_EMAILS gracefully', () => {
    vi.stubEnv('OPERATOR_EMAILS', '');
    expect(isOperatorEmail('admin@example.com')).toBe(false);
  });
});

describe('requireOperator middleware', () => {
  function basicAuthHeader(username: string, password: string) {
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  async function loadRequireOperator() {
    vi.resetModules();
    const mod = await import('./auth.js');
    return mod.requireOperator;
  }

  function buildApp(
    requireOperator: Awaited<ReturnType<typeof loadRequireOperator>>,
  ) {
    const app = new Hono();
    app.get('/test', requireOperator, (c) => c.text('ok'));
    return app;
  }

  beforeEach(() => {
    vi.stubEnv('ADMIN_USERNAME', 'admin');
    vi.stubEnv('ADMIN_PASSWORD', 'sup3r-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('returns 200 for valid Basic credentials', async () => {
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const res = await app.request('/test', {
      headers: {
        Authorization: basicAuthHeader('admin', 'sup3r-secret'),
        'x-forwarded-for': '203.0.113.10',
      },
    });
    expect(res.status).toBe(200);
  });

  it('returns 401 for invalid Basic credentials', async () => {
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const res = await app.request('/test', {
      headers: {
        Authorization: basicAuthHeader('admin', 'wrong-password'),
        'x-forwarded-for': '203.0.113.11',
      },
    });
    expect(res.status).toBe(401);
  });

  it('rejects requests with no identifiable IP in production (avoids a shared "unknown" bucket)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const res = await app.request('/test', {
      headers: {
        Authorization: basicAuthHeader('admin', 'sup3r-secret'),
        // x-forwarded-for / x-real-ip をどちらも付与しない
      },
    });
    expect(res.status).toBe(401);
  });

  it('still resolves clientIp to "unknown" outside production for local testing convenience', async () => {
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const res = await app.request('/test', {
      headers: {
        Authorization: basicAuthHeader('admin', 'sup3r-secret'),
      },
    });
    expect(res.status).toBe(200);
  });

  it('rate limits an IP after 5 failed attempts within the window', async () => {
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const ip = '203.0.113.12';
    const badAuth = basicAuthHeader('admin', 'wrong-password');

    for (let i = 0; i < 5; i++) {
      const res = await app.request('/test', {
        headers: { Authorization: badAuth, 'x-forwarded-for': ip },
      });
      expect(res.status).toBe(401);
    }

    const limited = await app.request('/test', {
      headers: { Authorization: badAuth, 'x-forwarded-for': ip },
    });
    expect(limited.status).toBe(429);

    // 別IPは制限の影響を受けない
    const otherIp = await app.request('/test', {
      headers: { Authorization: badAuth, 'x-forwarded-for': '203.0.113.13' },
    });
    expect(otherIp.status).toBe(401);
  });

  it('clears the failure history for an IP once it authenticates successfully', async () => {
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const ip = '203.0.113.14';
    const badAuth = basicAuthHeader('admin', 'wrong-password');
    const goodAuth = basicAuthHeader('admin', 'sup3r-secret');

    for (let i = 0; i < 4; i++) {
      await app.request('/test', {
        headers: { Authorization: badAuth, 'x-forwarded-for': ip },
      });
    }

    const success = await app.request('/test', {
      headers: { Authorization: goodAuth, 'x-forwarded-for': ip },
    });
    expect(success.status).toBe(200);

    // 履歴がクリアされているため、直後に1回失敗しても429にはならない
    const afterSuccess = await app.request('/test', {
      headers: { Authorization: badAuth, 'x-forwarded-for': ip },
    });
    expect(afterSuccess.status).toBe(401);
  });

  it('unblocks an IP once the rate limit window has fully elapsed', async () => {
    vi.useFakeTimers();
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const ip = '203.0.113.15';
    const badAuth = basicAuthHeader('admin', 'wrong-password');

    for (let i = 0; i < 5; i++) {
      await app.request('/test', {
        headers: { Authorization: badAuth, 'x-forwarded-for': ip },
      });
    }
    const limited = await app.request('/test', {
      headers: { Authorization: badAuth, 'x-forwarded-for': ip },
    });
    expect(limited.status).toBe(429);

    // 15分のウィンドウが経過すると失敗履歴が期限切れになり、再度失敗を
    // 記録できるようになる（429ではなく401が返る）
    vi.advanceTimersByTime(15 * 60 * 1000 + 1);
    const afterWindow = await app.request('/test', {
      headers: { Authorization: badAuth, 'x-forwarded-for': ip },
    });
    expect(afterWindow.status).toBe(401);
  });

  it('does not evict an actively-limited IP when the bucket cap is reached (LRU touch on check)', async () => {
    // バケット上限を小さく設定し、以下のループで実際に evictOldestBucket が
    // 呼ばれる（=対象の回帰が検出できる）ようにする。
    vi.stubEnv('RATE_LIMIT_MAX_BUCKETS', '5');
    const requireOperator = await loadRequireOperator();
    const app = buildApp(requireOperator);
    const targetIp = '203.0.113.16';
    const badAuth = basicAuthHeader('admin', 'wrong-password');

    for (let i = 0; i < 5; i++) {
      await app.request('/test', {
        headers: { Authorization: badAuth, 'x-forwarded-for': targetIp },
      });
    }
    const limitedFirst = await app.request('/test', {
      headers: { Authorization: badAuth, 'x-forwarded-for': targetIp },
    });
    expect(limitedFirst.status).toBe(429);

    // バケット上限(5)を超える数の別IPからのアクセスが挟まり、その都度
    // evictOldestBucket が呼ばれるが、対象IPは都度チェックされて挿入順が
    // touch により更新され続けるため、evict されず制限状態が維持される。
    for (let i = 0; i < 20; i++) {
      await app.request('/test', {
        headers: {
          Authorization: badAuth,
          'x-forwarded-for': `198.51.100.${i}`,
        },
      });
      const stillLimited = await app.request('/test', {
        headers: { Authorization: badAuth, 'x-forwarded-for': targetIp },
      });
      expect(stillLimited.status).toBe(429);
    }
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
