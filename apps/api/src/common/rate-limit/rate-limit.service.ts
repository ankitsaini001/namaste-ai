import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppException } from '../app.exception';
import { RateLimit } from './rate-limit.schema';

export type RateLimitRule = { limit: number; windowSeconds: number };

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

const DUPLICATE_KEY = 11000;

/** Fixed-window counters stored in MongoDB, so limits hold across API processes. */
@Injectable()
export class RateLimitService {
  constructor(@InjectModel(RateLimit.name) private readonly counters: Model<RateLimit>) {}

  async consume(
    rule: string,
    subject: string,
    { limit, windowSeconds }: RateLimitRule,
    now = new Date(),
  ): Promise<RateLimitResult> {
    const windowMs = windowSeconds * 1000;
    const window = Math.floor(now.getTime() / windowMs);
    const resetAt = new Date((window + 1) * windowMs);
    const count = await this.increment(`${rule}:${subject}:${window}`, resetAt);
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000)),
    };
  }

  /** Counts this attempt and throws 429 RATE_LIMITED once the limit is passed. */
  async enforce(rule: string, subject: string, limits: RateLimitRule, message?: string) {
    const result = await this.consume(rule, subject, limits);
    if (!result.allowed) {
      throw new AppException(
        HttpStatus.TOO_MANY_REQUESTS,
        'RATE_LIMITED',
        message ?? 'Too many attempts. Please try again shortly.',
        null,
        { retryAfterSeconds: result.retryAfterSeconds },
      );
    }
    return result;
  }

  private async increment(id: string, expiresAt: Date, retry = true): Promise<number> {
    try {
      const doc = await this.counters
        .findOneAndUpdate(
          { _id: id },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
          { upsert: true, new: true },
        )
        .lean();
      return doc.count;
    } catch (error) {
      // Two first hits in the same window can race on the upsert; the second retries as an update.
      if (retry && (error as { code?: number }).code === DUPLICATE_KEY) {
        return this.increment(id, expiresAt, false);
      }
      throw error;
    }
  }
}
