import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDogfoodingEmail } from './dogfooding.js';

describe('isDogfoodingEmail', () => {
  beforeEach(() => {
    // dogfooding 用 email は env から取得する。テストでは安定した値を stub する。
    vi.stubEnv(
      'DOGFOODING_EMAILS',
      'dogfooding-test@example.com,internal@example.com',
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true for a configured dogfooding address', () => {
    expect(isDogfoodingEmail('dogfooding-test@example.com')).toBe(true);
    expect(isDogfoodingEmail('internal@example.com')).toBe(true);
  });

  it('matches case-insensitively and trims whitespace', () => {
    expect(isDogfoodingEmail('DOGFOODING-TEST@example.com')).toBe(true);
    expect(isDogfoodingEmail('  dogfooding-test@example.com  ')).toBe(true);
  });

  it('returns false for unrelated addresses', () => {
    expect(isDogfoodingEmail('someone@example.com')).toBe(false);
    expect(isDogfoodingEmail('dogfooding@example.org')).toBe(false);
  });

  it('returns false for null, undefined, or empty string', () => {
    expect(isDogfoodingEmail(null)).toBe(false);
    expect(isDogfoodingEmail(undefined)).toBe(false);
    expect(isDogfoodingEmail('')).toBe(false);
  });

  it('disables dogfooding entirely when DOGFOODING_EMAILS is unset or empty', () => {
    // unset (undefined) のケース
    vi.stubEnv('DOGFOODING_EMAILS', undefined);
    expect(isDogfoodingEmail('dogfooding-test@example.com')).toBe(false);

    // 空文字
    vi.stubEnv('DOGFOODING_EMAILS', '');
    expect(isDogfoodingEmail('dogfooding-test@example.com')).toBe(false);

    // 空白とカンマのみ
    vi.stubEnv('DOGFOODING_EMAILS', '   ,  , ');
    expect(isDogfoodingEmail('dogfooding-test@example.com')).toBe(false);
  });
});
