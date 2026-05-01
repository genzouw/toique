export interface MailMessage {
  from?: string;
  to: string[];
  replyTo?: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailAdapter {
  readonly name: 'resend' | 'smtp';
  send(message: MailMessage): Promise<void>;
}
