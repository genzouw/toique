import nodemailer, { type Transporter } from 'nodemailer';
import type { MailAdapter, MailMessage } from './types.js';

export interface SmtpAdapterOptions {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  defaultFrom: string;
}

export class SmtpAdapter implements MailAdapter {
  readonly name = 'smtp' as const;
  private transporter: Transporter;
  private defaultFrom: string;

  constructor(options: SmtpAdapterOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure ?? false,
      auth:
        options.user && options.pass
          ? { user: options.user, pass: options.pass }
          : undefined,
    });
    this.defaultFrom = options.defaultFrom;
  }

  async send(message: MailMessage): Promise<void> {
    const from = message.from ?? this.defaultFrom;
    await this.transporter.sendMail({
      from,
      to: message.to,
      replyTo: message.replyTo,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
