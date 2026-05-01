import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmtpAdapter } from './smtp-adapter.js';

// vi.mock は hoisted されるため、参照する mock も vi.hoisted で巻き上げる必要がある。
const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'mock-id' });
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock },
}));

describe('SmtpAdapter', () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    createTransportMock.mockClear();
  });

  it('creates a transporter with the given host/port', () => {
    new SmtpAdapter({
      host: 'mailpit',
      port: 1025,
      defaultFrom: 'noreply@toique.dev',
    });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mailpit',
        port: 1025,
        secure: false,
        auth: undefined,
      }),
    );
  });

  it('passes auth when user/pass are provided', () => {
    new SmtpAdapter({
      host: 'smtp.example.com',
      port: 587,
      user: 'u',
      pass: 'p',
      defaultFrom: 'noreply@toique.dev',
    });

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: 'u', pass: 'p' } }),
    );
  });

  it('joins multiple recipients with comma when sending', async () => {
    const adapter = new SmtpAdapter({
      host: 'mailpit',
      port: 1025,
      defaultFrom: 'noreply@toique.dev',
    });

    await adapter.send({
      to: ['a@example.com', 'b@example.com'],
      subject: 'hello',
      text: 'body',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@toique.dev',
        to: 'a@example.com, b@example.com',
        subject: 'hello',
        text: 'body',
      }),
    );
  });
});
