import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import { RateLimitModule } from '../src/common/rate-limit/rate-limit.module';
import { RateLimitService } from '../src/common/rate-limit/rate-limit.service';
import { testMongoUri } from './support/test-db';

describe('RateLimitService', () => {
  let moduleRef: TestingModule;
  let limits: RateLimitService;
  const rule = { limit: 3, windowSeconds: 900 };
  const at = (iso: string) => new Date(iso);

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(testMongoUri()), RateLimitModule],
    }).compile();
    limits = moduleRef.get(RateLimitService);
  });

  afterAll(async () => {
    await moduleRef.get<Connection>(getConnectionToken()).dropDatabase();
    await moduleRef.close();
  });

  it('allows up to the limit in a window, then refuses with the seconds left', async () => {
    const now = at('2026-10-12T10:05:00Z');
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await limits.consume('test', 'a', rule, now));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[2]?.remaining).toBe(0);
    expect(results[3]?.retryAfterSeconds).toBe(600); // window ends at 10:15
  });

  it('counts each subject and each window separately', async () => {
    const now = at('2026-10-12T10:05:00Z');
    expect((await limits.consume('test', 'b', rule, now)).remaining).toBe(2);
    expect((await limits.consume('test', 'a', rule, at('2026-10-12T10:16:00Z'))).allowed).toBe(
      true,
    );
  });

  it('counts every request when many arrive at once', async () => {
    const now = at('2026-10-12T11:00:00Z');
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        limits.consume('burst', 'c', { limit: 5, windowSeconds: 60 }, now),
      ),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it('enforce() throws RATE_LIMITED with retryAfterSeconds', async () => {
    const tight = { limit: 1, windowSeconds: 60 };
    await limits.enforce('enforce', 'd', tight);
    await expect(limits.enforce('enforce', 'd', tight)).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      details: { retryAfterSeconds: expect.any(Number) },
    });
  });

  it('expires counters automatically (TTL index on expiresAt)', async () => {
    const connection = moduleRef.get<Connection>(getConnectionToken());
    await connection.syncIndexes();
    const indexes = await connection.collection('rateLimits').indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    );
  });
});
