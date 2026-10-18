import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { WorkerEnv } from '../../../config/env';
import {
  HandlesJob,
  type JobContext,
  type JobHandler,
  JobPostponed,
} from '../../../jobs/job-handler';
import { Email, type EmailKind } from '../email.schema';
import { EmailQuotaService, nextQuotaDay } from './email-quota.service';
import { EmailRenderer } from './email-renderer';
import { EMAIL_TRANSPORT, type EmailTransport } from './email-transport';

/** Statuses from which an email may still be sent; anything else was already handled. */
const SENDABLE = new Set(['queued', 'postponed']);

/** Secrets in an email's data, removed once it has been sent. */
const SECRET_FIELDS: Partial<Record<EmailKind, string[]>> = {
  login_code: ['code'],
  organiser_invite: ['joinUrl'],
};

/** Worker job: sends one email record, within today's allowance, exactly once. */
@Injectable()
@HandlesJob('send_email')
export class SendEmailHandler implements JobHandler<{ emailId: string }> {
  private readonly from: string;

  constructor(
    @InjectModel(Email.name) private readonly emails: Model<Email>,
    @Inject(EMAIL_TRANSPORT) private readonly transport: EmailTransport,
    private readonly quota: EmailQuotaService,
    private readonly renderer: EmailRenderer,
    config: ConfigService<WorkerEnv, true>,
  ) {
    this.from = config.get('EMAIL_FROM', { infer: true });
  }

  async handle(job: JobContext<{ emailId: string }>): Promise<void> {
    const email = await this.emails.findById(job.payload.emailId);
    if (!email || !SENDABLE.has(email.status)) return;

    // A login code or join link that has already expired is useless; don't send it.
    const expiresAt = email.templateData.expiresAt;
    if (typeof expiresAt === 'string' && new Date(expiresAt) <= new Date()) {
      await this.emails.updateOne(
        { _id: email._id },
        { $set: { status: 'skipped', lastError: 'Expired before it could be sent' } },
      );
      return;
    }

    const slot = await this.quota.reserve(email.priority);
    if (!slot.ok) {
      await this.emails.updateOne({ _id: email._id }, { $set: { status: 'postponed' } });
      throw new JobPostponed(nextQuotaDay(new Date()), "Today's email allowance is used up");
    }

    try {
      const rendered = await this.renderer.render(email.kind, email.templateData);
      const result = await this.transport.send({
        from: this.from,
        to: email.to,
        ...rendered,
        idempotencyKey: email.idempotencyKey,
      });
      await this.emails.updateOne(
        { _id: email._id },
        {
          $set: {
            status: 'sent',
            providerMessageId: result.providerMessageId,
            sentAt: new Date(),
            lastError: null,
          },
          $inc: { attempts: 1 },
          ...secretsToRemove(email.kind),
        },
      );
    } catch (error) {
      await this.quota.release(email.priority, slot.day);
      const finalAttempt = job.attempt >= job.maxAttempts;
      await this.emails.updateOne(
        { _id: email._id },
        {
          $set: {
            lastError: error instanceof Error ? error.message : String(error),
            ...(finalAttempt && { status: 'failed' }),
          },
          $inc: { attempts: 1 },
        },
      );
      throw error;
    }
  }
}

function secretsToRemove(kind: EmailKind) {
  const fields = SECRET_FIELDS[kind];
  if (!fields) return {};
  return { $unset: Object.fromEntries(fields.map((field) => [`templateData.${field}`, ''])) };
}
