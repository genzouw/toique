import { Resend } from 'resend';
import type { MailAdapter, MailMessage } from './types.js';

export interface ResendAdapterOptions {
  apiKey: string;
  defaultFrom: string;
}

export class ResendAdapter implements MailAdapter {
  readonly name = 'resend' as const;
  private client: Resend;
  private defaultFrom: string;

  constructor(options: ResendAdapterOptions) {
    this.client = new Resend(options.apiKey);
    this.defaultFrom = options.defaultFrom;
  }

  async send(message: MailMessage): Promise<void> {
    const from = message.from ?? this.defaultFrom;
    await this.client.emails.send({
      from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
