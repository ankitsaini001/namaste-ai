import { createTransport, type Transporter } from 'nodemailer';
import type { EmailTransport, OutgoingEmail } from './email-transport';

/** Local development: Mailpit catches every email (http://localhost:8025). */
export class SmtpTransport implements EmailTransport {
  private readonly transporter: Transporter;

  constructor(host: string, port: number) {
    this.transporter = createTransport({ host, port, secure: false });
  }

  async send(email: OutgoingEmail) {
    const info = await this.transporter.sendMail({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo,
      headers: { 'X-Idempotency-Key': email.idempotencyKey },
    });
    return { providerMessageId: info.messageId ?? null };
  }
}
