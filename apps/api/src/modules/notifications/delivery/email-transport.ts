export type OutgoingEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Lets the provider drop a repeat if the same email is retried after a crash. */
  idempotencyKey: string;
  replyTo?: string;
};

/** Delivers one email. SMTP (Mailpit) locally, Resend in production. */
export interface EmailTransport {
  send(email: OutgoingEmail): Promise<{ providerMessageId: string | null }>;
}

export const EMAIL_TRANSPORT = Symbol('EMAIL_TRANSPORT');
