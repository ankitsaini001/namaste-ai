import { Injectable } from '@nestjs/common';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Connection, Model } from 'mongoose';
import {
  HandlesJob,
  type JobContext,
  type JobHandler,
  JobPostponed,
} from '../src/jobs/job-handler';
import { JobQueue } from '../src/jobs/job-queue.service';
import { JobRunner } from '../src/jobs/job-runner.service';
import { Job } from '../src/jobs/job.schema';
import { JobRunnerModule, JobsModule } from '../src/jobs/jobs.module';
import { testMongoUri } from './support/test-db';

let behaviour: (job: JobContext) => Promise<void> = async () => {};

@Injectable()
@HandlesJob('send_email')
class TestHandler implements JobHandler {
  handle(job: JobContext) {
    return behaviour(job);
  }
}

describe('job queue and runner', () => {
  let moduleRef: TestingModule;
  let queue: JobQueue;
  let runner: JobRunner;
  let jobs: Model<Job>;
  let clock: Date;
  const advance = (ms: number) => (clock = new Date(clock.getTime() + ms));

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(testMongoUri()), JobsModule, JobRunnerModule],
      providers: [TestHandler],
    }).compile();
    queue = moduleRef.get(JobQueue);
    runner = moduleRef.get(JobRunner);
    jobs = moduleRef.get(getModelToken(Job.name));
    await moduleRef.get<Connection>(getConnectionToken()).syncIndexes();
  });

  beforeEach(async () => {
    await jobs.deleteMany({});
    clock = new Date('2026-10-12T10:00:00Z');
    runner.now = () => clock;
    behaviour = async () => {};
  });

  afterAll(async () => {
    await moduleRef.get<Connection>(getConnectionToken()).dropDatabase();
    await moduleRef.close();
  });

  it('runs a due job and marks it done', async () => {
    const seen: JobContext[] = [];
    behaviour = async (job) => void seen.push(job);
    const job = await queue.enqueue('send_email', { emailId: 'e1' }, { runAt: clock });

    expect(await runner.drain()).toBe(1);
    expect(seen[0]).toMatchObject({ type: 'send_email', payload: { emailId: 'e1' }, attempt: 1 });
    expect(await jobs.findById(job._id).lean()).toMatchObject({
      status: 'done',
      lockedBy: null,
      finishedAt: clock,
    });
  });

  it('does not run jobs scheduled for later', async () => {
    await queue.enqueue('send_email', {}, { runAt: new Date(clock.getTime() + 60_000) });
    expect(await runner.drain()).toBe(0);
    advance(60_000);
    expect(await runner.drain()).toBe(1);
  });

  it('retries after 30s, 2m, 10m and 1h, then marks the job failed', async () => {
    behaviour = async () => {
      throw new Error('smtp down');
    };
    const job = await queue.enqueue('send_email', {}, { runAt: clock });
    const delays: number[] = [];

    for (let attempt = 1; attempt <= 5; attempt++) {
      const before = clock.getTime();
      expect(await runner.drain()).toBe(1);
      const doc = (await jobs.findById(job._id).lean())!;
      expect(doc.attempts).toBe(attempt);
      expect(doc.lastError).toBe('smtp down');
      if (doc.status === 'failed') break;
      expect(doc.status).toBe('queued');
      delays.push(doc.runAt.getTime() - before);
      clock = doc.runAt;
    }

    expect(delays).toEqual([30_000, 120_000, 600_000, 3_600_000]);
    expect((await jobs.findById(job._id).lean())!.status).toBe('failed');
  });

  it('postpones without counting an attempt', async () => {
    const tomorrow = new Date('2026-10-13T00:00:00Z');
    behaviour = async () => {
      throw new JobPostponed(tomorrow, 'Daily email allowance used');
    };
    const job = await queue.enqueue('send_email', {}, { runAt: clock });
    await runner.drain();
    expect(await jobs.findById(job._id).lean()).toMatchObject({
      status: 'queued',
      runAt: tomorrow,
      attempts: 0,
      lastError: 'Daily email allowance used',
    });
  });

  it('picks a job up again when its worker crashed (lock expired)', async () => {
    const job = await queue.enqueue('send_email', {}, { runAt: clock });
    expect(await runner.claim()).not.toBeNull(); // claimed, then the worker "crashes"
    expect(await runner.claim()).toBeNull(); // still locked

    advance(5 * 60_000 + 1);
    const reclaimed = await runner.claim();
    expect(String(reclaimed?._id)).toBe(String(job._id));
    expect(reclaimed?.attempts).toBe(2);
  });

  it('never gives the same job to two claims at once', async () => {
    for (let i = 0; i < 5; i++) await queue.enqueue('send_email', { i }, { runAt: clock });
    const claims = await Promise.all(Array.from({ length: 10 }, () => runner.claim()));
    const ids = claims.filter(Boolean).map((job) => String(job!._id));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it('returns the existing job for a repeated dedupe key', async () => {
    const first = await queue.enqueue('send_email', { a: 1 }, { dedupeKey: 'revalidate:w1:1' });
    const second = await queue.enqueue('send_email', { a: 2 }, { dedupeKey: 'revalidate:w1:1' });
    expect(String(second._id)).toBe(String(first._id));
    expect(await jobs.countDocuments({ dedupeKey: 'revalidate:w1:1' })).toBe(1);
  });

  it('fails a job with no handler straight away', async () => {
    const job = await queue.enqueue('reset_demo', {}, { runAt: clock });
    await runner.drain();
    expect(await jobs.findById(job._id).lean()).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'No handler for job type reset_demo',
    });
  });

  it('refuses payloads over 16 KB', async () => {
    await expect(queue.enqueue('send_email', { big: 'x'.repeat(17_000) })).rejects.toThrow(/16 KB/);
  });
});
