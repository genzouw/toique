import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('stripe', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('should export a valid stripe instance with a provided secret key', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    const { stripe } = await import('./stripe');
    const Stripe = (await import('stripe')).default;
    expect(stripe).toBeInstanceOf(Stripe);
  });

  it('should export STRIPE_PRO_PRICE_ID as a string from environment variable', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    vi.stubEnv('STRIPE_PRO_PRICE_ID', 'price_test_123');
    const { STRIPE_PRO_PRICE_ID } = await import('./stripe');
    expect(typeof STRIPE_PRO_PRICE_ID).toBe('string');
    expect(STRIPE_PRO_PRICE_ID).toBe('price_test_123');
  });

  it('should warn and return empty string if STRIPE_PRO_PRICE_ID is not set', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const { STRIPE_PRO_PRICE_ID } = await import('./stripe');
    expect(STRIPE_PRO_PRICE_ID).toBe('');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'STRIPE_PRO_PRICE_ID is not set',
    );
  });

  it('should log a warning if STRIPE_SECRET_KEY is not set', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    await expect(import('./stripe')).rejects.toThrow();

    expect(consoleWarnSpy).toHaveBeenCalledWith('STRIPE_SECRET_KEY is not set');
  });
});
