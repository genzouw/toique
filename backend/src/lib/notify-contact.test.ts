import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notifyContact } from './notify-contact.js';

describe('notifyContact', () => {
  const originalEnv = process.env;
  let warnSpy: any;

  const dummyInput = {
    id: 'test-id',
    name: 'test-name',
    email: 'test@example.com',
    category: 'test-category',
    subject: 'test-subject',
    body: 'test-body',
    url: null,
    tenantName: null,
  };

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('skips and warns if RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('CONTACT_FROM', 'noreply@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', 'op1@test.com,op2@test.com');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: RESEND_API_KEY / CONTACT_FROM / OPERATOR_EMAILS いずれかが未設定'
    );
  });

  it('skips and warns if CONTACT_FROM is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_FROM', '');
    vi.stubEnv('OPERATOR_EMAILS', 'op1@test.com,op2@test.com');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: RESEND_API_KEY / CONTACT_FROM / OPERATOR_EMAILS いずれかが未設定'
    );
  });

  it('skips and warns if OPERATOR_EMAILS is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_FROM', 'noreply@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', '');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: RESEND_API_KEY / CONTACT_FROM / OPERATOR_EMAILS いずれかが未設定'
    );
  });

  it('skips and warns if OPERATOR_EMAILS is empty or only whitespace/commas', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('CONTACT_FROM', 'noreply@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', ' , ,  ');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: RESEND_API_KEY / CONTACT_FROM / OPERATOR_EMAILS いずれかが未設定'
    );
  });
});
