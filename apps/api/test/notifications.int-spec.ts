import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Connection, Model } from 'mongoose';
import { Job } from '../src/jobs/job.schema';
import { JobRunner } from '../src/jobs/job-runner.service';
import { JobRunnerModule } from '../src/jobs/jobs.module';
import { EmailDeliveryModule } from '../src/modules/notifications/delivery/email-delivery.module';
import {
  EmailQuotaService,
  nextQuotaDay,
} from '../src/modules/notifications/delivery/email-quota.service';
import {
  EMAIL_TRANSPORT,
  type EmailTransport,
  type OutgoingEmail,
} from '../src/modules/notifications/delivery/email-transport';
import { Email } from '../src/modules/notifications/email.schema';
import { NotificationsModule } from '../src/modules/notifications/notifications.module';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { testMongoUri } from './support/test-db';

class FakeTransport implements EmailTransport {
  sent: OutgoingEmail[] = [];
  failNext = 0;
  async send(email: OutgoingEmail) {
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error('Connection refused');
    }
    this.sent.push(email);
    return { providerMessageId: `msg-${this.sent.length}-${Date.now()}` };
  }
}

describe('sending email through the worker', () => {
  let moduleRef: TestingModule;
  let notifications: NotificationsService;
  let runner: JobRunner;
  let quota: EmailQuotaService;
  let emails: Model<Email>;
  let jobs: Model<Job>;
  const transport = new FakeTransport();
  const inTenMinutes = () => new Date(Date.now() + 10 * 60_000).toISOString();

  const loginCode = (key: string, overrides: Record<string, unknown> = {}) =>
    notifications.sendEmail({
      kind: 'login_code',
      to: 'princi@gmail.com',
      templateData: {
        code: '482913',
        expiresInMinutes: 10,
        expiresAt: inTenMinutes(),
        ...overrides,
      },
      idempotencyKey: key,
    });

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              EMAIL_FROM: 'Make My Marriage <no-reply@test.local>',
              EMAIL_DAILY_LIMIT: 3,
              EMAIL_RESERVED: 1,
            }),
          ],
        }),
        MongooseModule.forRoot(testMongoUri()),
        NotificationsModule,
        JobRunnerModule,
        EmailDeliveryModule,
      ],
    })
      .overrideProvider(EMAIL_TRANSPORT)
      .useValue(transport)
      .compile();
    notifications = moduleRef.get(NotificationsService);
    runner = moduleRef.get(JobRunner);
    quota = moduleRef.get(EmailQuotaService);
    emails = moduleRef.get(getModelToken(Email.name));
    jobs = moduleRef.get(getModelToken(Job.name));
    await moduleRef.get<Connection>(getConnectionToken()).syncIndexes();
  });

  beforeEach(async () => {
    const connection = moduleRef.get<Connection>(getConnectionToken());
    await Promise.all(
      ['emails', 'jobs', 'emailQuota'].map((c) => connection.collection(c).deleteMany({})),
    );
    transport.sent = [];
    transport.failNext = 0;
    runner.now = () => new Date();
  });

  afterAll(async () => {
    await moduleRef.get<Connection>(getConnectionToken()).dropDatabase();
    await moduleRef.close();
  });

  it('records the email and queues one job; repeating the same key does nothing more', async () => {
    const first = await loginCode('login_code:a');
    const again = await loginCode('login_code:a');
    expect(String(again._id)).toBe(String(first._id));
    expect(first).toMatchObject({ kind: 'login_code', priority: 1, status: 'queued' });
    expect(await emails.countDocuments()).toBe(1);
    expect(await jobs.countDocuments({ type: 'send_email' })).toBe(1);
  });

  it('sends it once, then removes the login code from the stored record', async () => {
    const email = await loginCode('login_code:b');
    await runner.drain();
    await runner.drain();

    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toMatchObject({
      from: 'Make My Marriage <no-reply@test.local>',
      to: 'princi@gmail.com',
      subject: '482913 is your Make My Marriage login code',
      idempotencyKey: 'login_code:b',
    });
    const stored = (await emails.findById(email._id).lean())!;
    expect(stored).toMatchObject({ status: 'sent', attempts: 1 });
    expect(stored.providerMessageId).toBeTruthy();
    expect(stored.templateData).not.toHaveProperty('code');
  });

  it('keeps reserved slots for priority 1: bulk and high-priority emails stop short of them', async () => {
    // Limit 3, reserved 1: priorities 2 and 3 may use 2 slots; priority 1 may use all 3.
    expect((await quota.reserve(3)).ok).toBe(true);
    expect((await quota.reserve(2)).ok).toBe(true);
    expect((await quota.reserve(3)).ok).toBe(false);
    expect((await quota.reserve(1)).ok).toBe(true);
    expect((await quota.reserve(1)).ok).toBe(false);
  });

  it('postpones to the next day when the allowance is used up, without counting an attempt', async () => {
    for (let i = 0; i < 3; i++) await quota.reserve(1);
    const email = await loginCode('login_code:c');
    await runner.drain();

    expect(transport.sent).toHaveLength(0);
    expect((await emails.findById(email._id).lean())!.status).toBe('postponed');
    const job = (await jobs.findOne({ 'payload.emailId': String(email._id) }).lean())!;
    expect(job).toMatchObject({ status: 'queued', attempts: 0, runAt: nextQuotaDay(new Date()) });
  });

  it('gives the slot back and retries when sending fails; marks the email failed at the end', async () => {
    transport.failNext = 99;
    const email = await loginCode('login_code:d');
    let clock = new Date();
    runner.now = () => clock;

    for (let attempt = 1; attempt <= 5; attempt++) {
      await runner.drain();
      const job = (await jobs.findOne({ 'payload.emailId': String(email._id) }).lean())!;
      clock = new Date(job.runAt.getTime() + 1);
    }

    const stored = (await emails.findById(email._id).lean())!;
    expect(stored).toMatchObject({
      status: 'failed',
      attempts: 5,
      lastError: 'Connection refused',
    });
    expect(transport.sent).toHaveLength(0);
    // Every reserved slot was released again.
    const day = new Date().toISOString().slice(0, 10);
    const counts = await moduleRef
      .get<Connection>(getConnectionToken())
      .collection('emailQuota')
      .findOne({ _id: day as never });
    expect(counts?.sent).toBe(0);
  });

  it('skips a login code that expired before it could be sent', async () => {
    const email = await loginCode('login_code:e', {
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    await runner.drain();
    expect(transport.sent).toHaveLength(0);
    expect((await emails.findById(email._id).lean())!.status).toBe('skipped');
  });
});
