import { describe, it, expect } from 'vitest';
import { isDogfoodingEmail, DOGFOODING_EMAILS } from './dogfooding.js';

describe('isDogfoodingEmail', () => {
  it('returns true for the canonical dogfooding address', () => {
    expect(isDogfoodingEmail('toique.official@gmail.com')).toBe(true);
  });

  it('matches case-insensitively and trims whitespace', () => {
    expect(isDogfoodingEmail('TOIQUE.OFFICIAL@gmail.com')).toBe(true);
    expect(isDogfoodingEmail('  toique.official@gmail.com  ')).toBe(true);
  });

  it('returns false for unrelated addresses', () => {
    expect(isDogfoodingEmail('someone@example.com')).toBe(false);
    expect(isDogfoodingEmail('toique@gmail.com')).toBe(false);
  });

  it('returns false for null, undefined, or empty string', () => {
    expect(isDogfoodingEmail(null)).toBe(false);
    expect(isDogfoodingEmail(undefined)).toBe(false);
    expect(isDogfoodingEmail('')).toBe(false);
  });

  it('exposes the configured email list as readonly metadata', () => {
    expect(DOGFOODING_EMAILS).toContain('toique.official@gmail.com');
  });
});
