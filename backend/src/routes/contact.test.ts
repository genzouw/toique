import { describe, it, expect } from 'vitest';
import { clientIp } from './contact.js';

describe('clientIp', () => {
  function headers(init: Record<string, string>): Headers {
    return new Headers(init);
  }

  it('returns rightmost IP from X-Forwarded-For (single IP)', () => {
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.1' }))).toBe(
      '203.0.113.1',
    );
  });

  it('returns rightmost IP from X-Forwarded-For (multiple IPs)', () => {
    // Client spoofs left IPs; Cloud Run proxy appends the real IP at the end
    expect(
      clientIp(headers({ 'x-forwarded-for': '1.2.3.4, 203.0.113.1' })),
    ).toBe('203.0.113.1');
  });

  it('returns rightmost IP from X-Forwarded-For (many proxies)', () => {
    expect(
      clientIp(
        headers({ 'x-forwarded-for': '10.0.0.1, 10.0.0.2, 203.0.113.1' }),
      ),
    ).toBe('203.0.113.1');
  });

  it('trims whitespace around IPs', () => {
    expect(
      clientIp(headers({ 'x-forwarded-for': ' 1.2.3.4 , 203.0.113.1 ' })),
    ).toBe('203.0.113.1');
  });

  it('falls back to x-real-ip when X-Forwarded-For is absent', () => {
    expect(clientIp(headers({ 'x-real-ip': '198.51.100.1' }))).toBe(
      '198.51.100.1',
    );
  });

  it('returns unknown when no IP headers are present', () => {
    expect(clientIp(headers({}))).toBe('unknown');
  });
});
