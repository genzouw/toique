import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';

const originalEnv = process.env;

describe('stripe', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should export a valid stripe instance with a provided secret key', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    const { stripe } = await import('./stripe');
    const Stripe = (await import('stripe')).default;
    expect(stripe).toBeInstanceOf(Stripe);
  });

  it('should export STRIPE_PRO_PRICE_ID as a string from environment variable', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_PRO_PRICE_ID = 'price_test_123';
    const { STRIPE_PRO_PRICE_ID } = await import('./stripe');
    expect(typeof STRIPE_PRO_PRICE_ID).toBe('string');
    expect(STRIPE_PRO_PRICE_ID).toBe('price_test_123');
  });

  it('should fallback to default STRIPE_PRO_PRICE_ID if not provided', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    delete process.env.STRIPE_PRO_PRICE_ID;
    const { STRIPE_PRO_PRICE_ID } = await import('./stripe');
    expect(typeof STRIPE_PRO_PRICE_ID).toBe('string');
    expect(STRIPE_PRO_PRICE_ID).toBe('price_1TNM1yIlm7LOZC27Pv95rexs');
  });

  it('should log a warning if STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Using a try-catch because Stripe throws an error if apiKey is empty or undefined
    try {
      await import('./stripe');
    } catch (e) {
      // Expected to throw because of empty API key in this mock test
    }

    expect(consoleWarnSpy).toHaveBeenCalledWith('STRIPE_SECRET_KEY is not set');
    consoleWarnSpy.mockRestore();
  });
});
