import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import type { WorkerEnv } from '../../../config/env';
import { EmailQuota } from '../email-quota.schema';
import type { EmailPriority } from '../email.schema';

const DUPLICATE_KEY = 11000;

/** UTC day id, for example 2026-12-01. */
export const quotaDay = (now: Date) => now.toISOString().slice(0, 10);

/** Start of the next UTC day, when the allowance resets. */
export const nextQuotaDay = (now: Date) =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

/**
 * The daily email allowance (System Design §13.3). Priority 1 may use the whole limit; priorities
 * 2 and 3 stop short of the reserved slots. Slots are taken in one atomic update, so parallel
 * sends can never go over.
 */
@Injectable()
export class EmailQuotaService {
  private readonly dailyLimit: number;
  private readonly reserved: number;

  constructor(
    @InjectModel(EmailQuota.name) private readonly quota: Model<EmailQuota>,
    config: ConfigService<WorkerEnv, true>,
  ) {
    this.dailyLimit = config.get('EMAIL_DAILY_LIMIT', { infer: true });
    this.reserved = config.get('EMAIL_RESERVED', { infer: true });
  }

  limitFor(priority: EmailPriority): number {
    return priority === 1 ? this.dailyLimit : this.dailyLimit - this.reserved;
  }

  async reserve(priority: EmailPriority, n = 1, now = new Date()) {
    const day = quotaDay(now);
    await this.ensureDay(day, now);
    const result = await this.quota.updateOne(
      { _id: day, sent: { $lte: this.limitFor(priority) - n } },
      { $inc: { sent: n, ...(priority === 3 && { bulkSent: n }) } },
    );
    return { ok: result.modifiedCount === 1, day };
  }

  /** Gives slots back when a send fails. */
  async release(priority: EmailPriority, day: string, n = 1): Promise<void> {
    await this.quota.updateOne(
      { _id: day },
      { $inc: { sent: -n, ...(priority === 3 && { bulkSent: -n }) } },
    );
  }

  private async ensureDay(day: string, now: Date): Promise<void> {
    try {
      await this.quota.updateOne(
        { _id: day },
        {
          $setOnInsert: {
            sent: 0,
            bulkSent: 0,
            dailyLimit: this.dailyLimit,
            reserved: this.reserved,
            createdAt: now,
          },
        },
        { upsert: true },
      );
    } catch (error) {
      if ((error as { code?: number }).code !== DUPLICATE_KEY) throw error;
    }
  }
}
