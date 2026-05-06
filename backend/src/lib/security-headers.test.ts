import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { securityHeadersConfig } from './security-headers.js';

function buildTestApp() {
  const app = new Hono();
  app.use('*', secureHeaders(securityHeadersConfig));
  app.get('/ping', (c) => c.json({ ok: true }));
  return app;
}

describe('securityHeadersConfig', () => {
  it('Content-Security-Policy が default-src none を含む', async () => {
    const res = await buildTestApp().request('/ping');
    const csp = res.headers.get('content-security-policy');
    expect(csp).toContain("default-src 'none'");
  });

  it('Content-Security-Policy が frame-ancestors none を含む', async () => {
    const res = await buildTestApp().request('/ping');
    const csp = res.headers.get('content-security-policy');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('Content-Security-Policy が base-uri none を含む', async () => {
    const res = await buildTestApp().request('/ping');
    const csp = res.headers.get('content-security-policy');
    expect(csp).toContain("base-uri 'none'");
  });

  it('Cross-Origin-Resource-Policy が cross-origin に設定されている', async () => {
    const res = await buildTestApp().request('/ping');
    expect(res.headers.get('cross-origin-resource-policy')).toBe(
      'cross-origin',
    );
  });

  it('X-Content-Type-Options が nosniff に設定されている', async () => {
    const res = await buildTestApp().request('/ping');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('X-Frame-Options が DENY に設定されている', async () => {
    const res = await buildTestApp().request('/ping');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });
});
