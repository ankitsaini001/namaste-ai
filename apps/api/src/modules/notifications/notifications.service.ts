import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { Connection, Model, Types } from 'mongoose';
import { JobQueue } from '../../jobs/job-queue.service';
import { Email, type EmailDocument, type EmailKind, PRIORITY_BY_KIND } from './email.schema';

export type SendEmailInput = {
  kind: EmailKind;
  to: string;
  templateData: Record<string, unknown>;
  /** For example `login_code:{loginCodeId}`; repeating it never sends a second email. */
  idempotencyKey: string;
  weddingId?: Types.ObjectId | null;
  guestId?: Types.ObjectId | null;
};

const DUPLICATE_KEY = 11000;

/**
 * The only way features send messages (System Design §13.1). Email goes out through the worker;
 * WhatsApp and SMS channels slot in here later without changing callers.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Email.name) private readonly emails: Model<Email>,
    @InjectConnection() private readonly connection: Connection,
    private readonly jobs: JobQueue,
  ) {}

  /** Records the email and queues its `send_email` job together, so neither exists alone. */
  async sendEmail(input: SendEmailInput): Promise<EmailDocument> {
    try {
      return await this.connection.transaction(async (session) => {
        const existing = await this.emails
          .findOne({ idempotencyKey: input.idempotencyKey })
          .session(session);
        if (existing) return existing;

        const [email] = await this.emails.create(
          [
            {
              kind: input.kind,
              priority: PRIORITY_BY_KIND[input.kind],
              to: input.to,
              templateData: input.templateData,
              idempotencyKey: input.idempotencyKey,
              weddingId: input.weddingId ?? null,
              guestId: input.guestId ?? null,
            },
          ],
          { session },
        );
        await this.jobs.enqueue('send_email', { emailId: String(email!._id) }, { session });
        return email!;
      });
    } catch (error) {
      // Two identical requests at once: the second loses the unique index race.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        const existing = await this.emails.findOne({ idempotencyKey: input.idempotencyKey });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
