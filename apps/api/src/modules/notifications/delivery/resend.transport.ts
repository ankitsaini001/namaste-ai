import { Resend } from 'resend';
import type { EmailTransport, OutgoingEmail } from './email-transport';

/** Production: Resend, with its idempotency key so a retried send is never delivered twice. */
export class ResendTransport implements EmailTransport {
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(email: OutgoingEmail) {
    const { data, error } = await this.client.emails.send(
      {
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo && { replyTo: email.replyTo }),
      },
      { idempotencyKey: email.idempotencyKey },
    );
    // The message never includes the recipient, so it is safe to log.
    if (error || !data) throw new Error(`Resend rejected the email: ${error?.message ?? 'no id'}`);
    return { providerMessageId: data.id };
  }
}
