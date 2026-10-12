import { SetMetadata } from '@nestjs/common';
import type { Types } from 'mongoose';
import type { JobType } from './job.schema';

export const JOB_HANDLER = 'jobHandler';

/** Marks a provider as the worker's handler for one job type. */
export const HandlesJob = (type: JobType) => SetMetadata(JOB_HANDLER, type);

/** What a handler receives. `attempt` starts at 1. */
export type JobContext<P = Record<string, unknown>> = {
  id: Types.ObjectId;
  type: JobType;
  payload: P;
  attempt: number;
  maxAttempts: number;
};

export interface JobHandler<P = Record<string, unknown>> {
  handle(job: JobContext<P>): Promise<void>;
}

/**
 * Thrown by a handler to run the job again later without counting a failed attempt, for example
 * when today's email allowance is used up (System Design §12.1).
 */
export class JobPostponed extends Error {
  constructor(
    readonly runAt: Date,
    reason: string,
  ) {
    super(reason);
    this.name = 'JobPostponed';
  }
}
