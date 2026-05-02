import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMailerFromEnv, resetMailerCache, getMailer } from './index.js';
import { ResendAdapter } from './resend-adapter.js';
import { SmtpAdapter } from './smtp-adapter.js';

describe('createMailerFromEnv', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    resetMailerCache();
    vi.stubEnv('MAIL_DRIVER', '');
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('SMTP_HOST', '');
    vi.stubEnv('MAIL_FROM', '');
    vi.stubEnv('CONTACT_FROM', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetMailerCache();
  });

  it('returns null when no driver is configured', () => {
    expect(createMailerFromEnv()).toBeNull();
  });

  it('infers resend driver from RESEND_API_KEY', () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');

    const adapter = createMailerFromEnv();
    expect(adapter).toBeInstanceOf(ResendAdapter);
    expect(adapter?.name).toBe('resend');
  });

  it('infers smtp driver from SMTP_HOST when RESEND_API_KEY is missing', () => {
    vi.stubEnv('SMTP_HOST', 'mailpit');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');

    const adapter = createMailerFromEnv();
    expect(adapter).toBeInstanceOf(SmtpAdapter);
    expect(adapter?.name).toBe('smtp');
  });

  it('explicit MAIL_DRIVER=smtp overrides RESEND_API_KEY presence', () => {
    vi.stubEnv('MAIL_DRIVER', 'smtp');
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('SMTP_HOST', 'mailpit');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');

    const adapter = createMailerFromEnv();
    expect(adapter).toBeInstanceOf(SmtpAdapter);
  });

  it('falls back to CONTACT_FROM when MAIL_FROM is unset', () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_FROM', 'fallback@toique.dev');

    const adapter = createMailerFromEnv();
    expect(adapter).toBeInstanceOf(ResendAdapter);
  });

  it('warns and returns null when resend driver selected but api key missing', () => {
    vi.stubEnv('MAIL_DRIVER', 'resend');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');

    expect(createMailerFromEnv()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('warns and returns null when smtp driver selected but host missing', () => {
    vi.stubEnv('MAIL_DRIVER', 'smtp');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');

    expect(createMailerFromEnv()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('caches singleton between getMailer calls', () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');

    const first = getMailer();
    const second = getMailer();
    expect(first).toBe(second);
  });
});
