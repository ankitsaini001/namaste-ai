import {
  type BeforeApplicationShutdown,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { hostname } from 'node:os';
import type { Model } from 'mongoose';
import { JOB_HANDLER, type JobHandler, JobPostponed } from './job-handler';
import { Job, type JobDocument, type JobType } from './job.schema';

/** Retry delays after attempts 1–4; the 5th failure marks the job failed (System Design §12.1). */
export const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];
const LOCK_MS = 5 * 60_000;
const CONCURRENCY = 5;
const IDLE_POLL_MS = 1_000;

/**
 * The worker's loop: claims due jobs one at a time with an atomic update (so two workers never take
 * the same job), runs up to five at once, and retries or fails them. A job whose worker crashed is
 * claimed again once its five-minute lock expires.
 */
@Injectable()
export class JobRunner implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger('Worker');
  readonly workerId = `${hostname()}:${process.pid}`;
  /** Overridable in tests. */
  now: () => Date = () => new Date();

  private handlers?: Map<JobType, JobHandler>;
  private running = false;
  private readonly inFlight = new Set<Promise<void>>();
  private wake?: () => void;

  constructor(
    @InjectModel(Job.name) private readonly jobs: Model<Job>,
    private readonly discovery: DiscoveryService,
  ) {}

  onApplicationBootstrap(): void {
    this.running = true;
    this.logger.log(
      `Worker ready (job types: ${[...this.getHandlers().keys()].join(', ') || 'none'})`,
    );
    void this.loop();
  }

  /** Runs before the database connection closes: stop claiming and let running jobs finish. */
  async beforeApplicationShutdown(signal?: string): Promise<void> {
    this.running = false;
    this.wake?.();
    await Promise.allSettled([...this.inFlight]);
    this.logger.log(`Worker stopped${signal ? ` (${signal})` : ''}`);
  }

  /** Claims and runs due jobs one after another until none are left. For tests and scripts. */
  async drain(): Promise<number> {
    let count = 0;
    for (let job = await this.claim(); job; job = await this.claim()) {
      await this.process(job);
      count++;
    }
    return count;
  }

  async claim(): Promise<JobDocument | null> {
    const now = this.now();
    return this.jobs.findOneAndUpdate(
      {
        $or: [
          { status: 'queued', runAt: { $lte: now } },
          { status: 'running', lockedUntil: { $lt: now } },
        ],
      },
      {
        $set: {
          status: 'running',
          lockedBy: this.workerId,
          lockedUntil: new Date(now.getTime() + LOCK_MS),
        },
        $inc: { attempts: 1 },
      },
      { sort: { runAt: 1 }, new: true },
    );
  }

  async process(job: JobDocument): Promise<void> {
    const handler = this.getHandlers().get(job.type);
    try {
      if (!handler) throw new Error(`No handler for job type ${job.type}`);
      await handler.handle({
        id: job._id,
        type: job.type,
        payload: job.payload,
        attempt: job.attempts,
      });
      await this.finish(job, { status: 'done', finishedAt: this.now(), lastError: null });
    } catch (error) {
      await this.handleError(job, error, Boolean(handler));
    }
  }

  private async handleError(job: JobDocument, error: unknown, retryable: boolean): Promise<void> {
    if (error instanceof JobPostponed) {
      // Postponed, not failed: the attempt doesn't count.
      await this.finish(
        job,
        { status: 'queued', runAt: error.runAt, lastError: error.message },
        -1,
      );
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (retryable && job.attempts < job.maxAttempts) {
      const delay = RETRY_DELAYS_MS[Math.min(job.attempts, RETRY_DELAYS_MS.length) - 1]!;
      await this.finish(job, {
        status: 'queued',
        runAt: new Date(this.now().getTime() + delay),
        lastError: message,
      });
      this.logger.warn(
        `Job ${job.type} ${String(job._id)} failed (attempt ${job.attempts}); will retry`,
      );
      return;
    }
    await this.finish(job, { status: 'failed', finishedAt: this.now(), lastError: message });
    this.logger.error(`Job ${job.type} ${String(job._id)} failed permanently: ${message}`);
  }

  /** Updates only if this worker still holds the lock. */
  private async finish(job: JobDocument, set: Partial<Job>, attemptsDelta = 0): Promise<void> {
    await this.jobs.updateOne(
      { _id: job._id, lockedBy: this.workerId },
      {
        $set: { ...set, lockedBy: null, lockedUntil: null },
        ...(attemptsDelta !== 0 && { $inc: { attempts: attemptsDelta } }),
      },
    );
  }

  private async loop(): Promise<void> {
    while (this.running) {
      if (this.inFlight.size >= CONCURRENCY) {
        await Promise.race(this.inFlight);
        continue;
      }
      let job: JobDocument | null = null;
      try {
        job = await this.claim();
      } catch (error) {
        this.logger.error(`Could not claim a job: ${(error as Error).message}`);
      }
      if (!job) {
        await this.sleep(IDLE_POLL_MS);
        continue;
      }
      const task: Promise<void> = this.process(job).finally(() => this.inFlight.delete(task));
      this.inFlight.add(task);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, ms);
      this.wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  /** Finds providers marked @HandlesJob(type). */
  private getHandlers(): Map<JobType, JobHandler> {
    if (!this.handlers) {
      this.handlers = new Map();
      for (const wrapper of this.discovery.getProviders()) {
        const { instance, metatype } = wrapper;
        if (!instance || !metatype) continue;
        const type = Reflect.getMetadata(JOB_HANDLER, metatype) as JobType | undefined;
        if (type) this.handlers.set(type, instance as JobHandler);
      }
    }
    return this.handlers;
  }
}
