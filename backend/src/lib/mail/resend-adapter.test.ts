import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResendAdapter } from './resend-adapter.js';

const sendMock = vi.fn().mockResolvedValue({ id: 'mock-email-id' });

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

describe('ResendAdapter', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it('uses defaultFrom when message.from is omitted', async () => {
    const adapter = new ResendAdapter({
      apiKey: 'test',
      defaultFrom: 'noreply@toique.dev',
    });

    await adapter.send({
      to: ['user@example.com'],
      subject: 'hello',
      text: 'body',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@toique.dev',
        to: ['user@example.com'],
        subject: 'hello',
        text: 'body',
      }),
    );
  });

  it('prefers message.from over defaultFrom', async () => {
    const adapter = new ResendAdapter({
      apiKey: 'test',
      defaultFrom: 'noreply@toique.dev',
    });

    await adapter.send({
      from: 'override@toique.dev',
      to: ['user@example.com'],
      subject: 'hello',
      text: 'body',
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'override@toique.dev' }),
    );
  });
});
