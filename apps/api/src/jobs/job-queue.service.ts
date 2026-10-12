import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model } from 'mongoose';
import { Job, type JobDocument, type JobType } from './job.schema';

const MAX_PAYLOAD_BYTES = 16 * 1024;
const DUPLICATE_KEY = 11000;

export type EnqueueOptions = {
  runAt?: Date;
  /** A job with the same key already queued or done is returned instead of creating another. */
  dedupeKey?: string;
  maxAttempts?: number;
  session?: ClientSession;
};

/** Adds background jobs. Used by the API; the worker's JobRunner runs them. */
@Injectable()
export class JobQueue {
  constructor(@InjectModel(Job.name) private readonly jobs: Model<Job>) {}

  async enqueue(
    type: JobType,
    payload: Record<string, unknown>,
    options: EnqueueOptions = {},
  ): Promise<JobDocument> {
    if (Buffer.byteLength(JSON.stringify(payload)) > MAX_PAYLOAD_BYTES) {
      throw new Error(`Job payload for ${type} is larger than 16 KB`);
    }
    try {
      const [job] = await this.jobs.create(
        [
          {
            type,
            payload,
            runAt: options.runAt ?? new Date(),
            dedupeKey: options.dedupeKey ?? null,
            ...(options.maxAttempts && { maxAttempts: options.maxAttempts }),
          },
        ],
        { session: options.session },
      );
      return job!;
    } catch (error) {
      if (options.dedupeKey && (error as { code?: number }).code === DUPLICATE_KEY) {
        const existing = await this.jobs
          .findOne({ dedupeKey: options.dedupeKey })
          .session(options.session ?? null);
        if (existing) return existing;
      }
      throw error;
    }
  }
}
