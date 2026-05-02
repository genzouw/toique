import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { notifyContact } from './notify-contact.js';
import { resetMailerCache } from './mail/index.js';

const sendMock = vi.fn().mockResolvedValue({ id: 'mock-email-id' });

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('notifyContact', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

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
    sendMock.mockClear();
    resetMailerCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetMailerCache();
  });

  it('skips and warns if OPERATOR_EMAILS is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', '');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: OPERATOR_EMAILS is not set',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('skips and warns if OPERATOR_EMAILS only contains whitespace/commas', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', ' , ,  ');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: OPERATOR_EMAILS is not set',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('skips and warns if mailer is not configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('SMTP_HOST', '');
    vi.stubEnv('MAIL_FROM', '');
    vi.stubEnv('OPERATOR_EMAILS', 'op1@test.com');

    await notifyContact(dummyInput);

    expect(warnSpy).toHaveBeenCalledWith(
      '[notify-contact] skipped: mailer is not configured (set RESEND_API_KEY/SMTP_HOST and MAIL_FROM)',
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('falls back to CONTACT_FROM when MAIL_FROM is unset (backward compat)', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', '');
    vi.stubEnv('CONTACT_FROM', 'legacy@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', 'op1@test.com');

    await notifyContact(dummyInput);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'legacy@toique.dev' }),
    );
  });

  it('sends via Resend when env is fully configured', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    vi.stubEnv('MAIL_FROM', 'noreply@toique.dev');
    vi.stubEnv('OPERATOR_EMAILS', 'op1@test.com,op2@test.com');

    await notifyContact(dummyInput);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@toique.dev',
        to: ['op1@test.com', 'op2@test.com'],
        replyTo: 'test@example.com',
        subject: '[Toique お問い合わせ] test-subject',
      }),
    );
  });
});
