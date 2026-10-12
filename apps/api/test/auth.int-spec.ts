import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { errorResponseSchema, meSchema } from '@mmm/shared';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/modules/auth/auth.module';
import { testMongoUri } from './support/test-db';

const WEB_ORIGIN = 'http://localhost:3000';
let counter = 0;
const newEmail = () => `guest${++counter}.${Date.now()}@example.com`;

describe('email-code login (AUTH-02 to AUTH-06)', () => {
  let app: INestApplication;
  let db: Connection;

  const post = (path: string, body?: object, cookie?: string) => {
    const req = request(app.getHttpServer()).post(`/v1${path}`).set('Origin', WEB_ORIGIN);
    if (cookie) req.set('Cookie', cookie);
    return body ? req.send(body) : req;
  };
  const get = (path: string, cookie?: string) => {
    const req = request(app.getHttpServer()).get(`/v1${path}`);
    return cookie ? req.set('Cookie', cookie) : req;
  };
  const requestCode = (email: string) => post('/auth/email-code', { email });
  /** The code is in the queued email's data until the worker sends it. */
  const latestCode = async (email: string): Promise<string> => {
    const doc = await db.collection('emails').find({ to: email }).sort({ createdAt: -1 }).next();
    return doc!.templateData.code as string;
  };
  const sessionCookie = (res: request.Response) => {
    const header = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    return header.find((c) => c.startsWith('mmm_session='));
  };
  const login = async (email = newEmail()) => {
    await requestCode(email).expect(202);
    const res = await post('/auth/email-code/verify', { email, code: await latestCode(email) });
    expect(res.status).toBe(200);
    return { email, res, cookie: sessionCookie(res)!.split(';')[0]! };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LOGIN_CODE_SECRET: 's'.repeat(40), COOKIE_SECURE: true })],
        }),
        MongooseModule.forRoot(testMongoUri()),
        AuthModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: WEB_ORIGIN });
    await app.init();
    db = app.get(getConnectionToken());
    await db.syncIndexes();
  });

  beforeEach(async () => {
    // Every request comes from the same test IP; reset its counters between tests.
    await db.collection('rateLimits').deleteMany({});
  });

  afterAll(async () => {
    await db.dropDatabase();
    await app.close();
  });

  describe('POST /v1/auth/email-code', () => {
    it('gives the same reply whether or not an account exists, and queues the email', async () => {
      const { email } = await login();
      const known = await requestCode(email).expect(202);
      const unknown = await requestCode(newEmail()).expect(202);
      expect(known.body).toEqual({ data: { sent: true, expiresInSeconds: 600 } });
      expect(unknown.body).toEqual(known.body);
      expect(await db.collection('emails').countDocuments({ to: email, kind: 'login_code' })).toBe(
        2,
      );
      expect(await db.collection('jobs').countDocuments({ type: 'send_email' })).toBeGreaterThan(0);
    });

    it('stores only a hash of the code, and creates no account before the code is used', async () => {
      const email = newEmail();
      await requestCode(email).expect(202);
      const code = await latestCode(email);
      const stored = await db.collection('loginCodes').findOne({ email });
      expect(stored!.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(stored)).not.toContain(code);
      expect(await db.collection('users').countDocuments({ email })).toBe(0);
    });

    it('allows 3 codes per email per 15 minutes (AUTH-04)', async () => {
      const email = newEmail();
      for (let i = 0; i < 3; i++) await requestCode(email).expect(202);
      const res = await requestCode(email).expect(429);
      expect(res.body.error.code).toBe('RATE_LIMITED');
      expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('allows 10 requests per IP per hour', async () => {
      for (let i = 0; i < 10; i++) await requestCode(newEmail()).expect(202);
      expect((await requestCode(newEmail()).expect(429)).body.error.code).toBe('RATE_LIMITED');
    });

    it('rejects an invalid email with a message for the person', async () => {
      const res = await requestCode('not-an-email').expect(400);
      expect(errorResponseSchema.parse(res.body).error).toMatchObject({
        code: 'VALIDATION_FAILED',
        field: 'email',
      });
    });
  });

  describe('POST /v1/auth/email-code/verify', () => {
    it('signs a new user in: Me with needsName, and a secure 30-day session cookie', async () => {
      const { email, res } = await login();
      expect(meSchema.parse(res.body.data)).toMatchObject({
        user: { email, name: null, hasGoogle: false },
        needsName: true,
        wedding: null,
        role: null,
      });
      const cookie = sessionCookie(res)!;
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/Secure/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).toMatch(/Path=\//);
      const expires = new Date(/Expires=([^;]+)/.exec(cookie)![1]!).getTime();
      expect(expires - Date.now()).toBeGreaterThan(29.9 * 24 * 3600_000);

      const token = cookie.split(';')[0]!.split('=')[1]!;
      const session = await db.collection('sessions').findOne({});
      expect(JSON.stringify(await db.collection('sessions').find().toArray())).not.toContain(token);
      expect(session!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('counts down wrong tries, then locks the code even for the right answer', async () => {
      const email = newEmail();
      await requestCode(email).expect(202);
      const right = await latestCode(email);
      const wrong = right === '000000' ? '111111' : '000000';

      for (const left of [4, 3, 2, 1]) {
        const res = await post('/auth/email-code/verify', { email, code: wrong }).expect(400);
        expect(res.body.error).toMatchObject({
          code: 'LOGIN_CODE_INVALID',
          field: 'code',
          details: { attemptsLeft: left },
        });
      }
      const fifth = await post('/auth/email-code/verify', { email, code: wrong }).expect(429);
      expect(fifth.body.error.code).toBe('LOGIN_CODE_LOCKED');
      const after = await post('/auth/email-code/verify', { email, code: right }).expect(429);
      expect(after.body.error.code).toBe('LOGIN_CODE_LOCKED');
    });

    it('works only once', async () => {
      const email = newEmail();
      await requestCode(email).expect(202);
      const code = await latestCode(email);
      await post('/auth/email-code/verify', { email, code }).expect(200);
      const again = await post('/auth/email-code/verify', { email, code }).expect(410);
      expect(again.body.error.code).toBe('LOGIN_CODE_EXPIRED');
    });

    it('expires after 10 minutes', async () => {
      const email = newEmail();
      await requestCode(email).expect(202);
      const code = await latestCode(email);
      await db
        .collection('loginCodes')
        .updateOne({ email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      const res = await post('/auth/email-code/verify', { email, code }).expect(410);
      expect(res.body.error.code).toBe('LOGIN_CODE_EXPIRED');
    });

    it('accepts only the newest code', async () => {
      const email = newEmail();
      await requestCode(email).expect(202);
      const older = await latestCode(email);
      await requestCode(email).expect(202);
      const newer = await latestCode(email);
      if (older !== newer) {
        await post('/auth/email-code/verify', { email, code: older }).expect(400);
      }
      await post('/auth/email-code/verify', { email, code: newer }).expect(200);
    });

    it('signs a returning user into the same account', async () => {
      const first = await login();
      const second = await login(first.email);
      expect(second.res.body.data.user.id).toBe(first.res.body.data.user.id);
      expect(await db.collection('users').countDocuments({ email: first.email })).toBe(1);
    });

    it('fails with LOGIN_CODE_INVALID when no code was requested', async () => {
      const res = await post('/auth/email-code/verify', { email: newEmail(), code: '123456' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('LOGIN_CODE_INVALID');
    });
  });

  describe('/v1/me and logout', () => {
    it('returns the current user and saves their name once (AUTH-05)', async () => {
      const { cookie, email } = await login();
      expect((await get('/me', cookie).expect(200)).body.data.needsName).toBe(true);

      const named = await request(app.getHttpServer())
        .patch('/v1/me')
        .set('Origin', WEB_ORIGIN)
        .set('Cookie', cookie)
        .send({ name: '  Princi Sharma ' })
        .expect(200);
      expect(named.body.data).toMatchObject({
        user: { name: 'Princi Sharma', email },
        needsName: false,
      });
      expect((await get('/me', cookie).expect(200)).body.data.user.name).toBe('Princi Sharma');
    });

    it('rejects a blank name', async () => {
      const { cookie } = await login();
      const res = await request(app.getHttpServer())
        .patch('/v1/me')
        .set('Origin', WEB_ORIGIN)
        .set('Cookie', cookie)
        .send({ name: '   ' })
        .expect(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', field: 'name' });
    });

    it('needs a session: AUTH_REQUIRED without a cookie, SESSION_EXPIRED for an unknown one', async () => {
      expect((await get('/me').expect(401)).body.error.code).toBe('AUTH_REQUIRED');
      const res = await get('/me', 'mmm_session=not-a-real-token').expect(401);
      expect(res.body.error.code).toBe('SESSION_EXPIRED');
      expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    });

    it('logs out: the session is deleted and the cookie cleared', async () => {
      const { cookie } = await login();
      const res = await post('/auth/logout', undefined, cookie).expect(204);
      expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect((await get('/me', cookie).expect(401)).body.error.code).toBe('SESSION_EXPIRED');
    });

    it('ends the session when it expires (AUTH-06)', async () => {
      const { cookie } = await login();
      await db
        .collection('sessions')
        .updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await get('/me', cookie).expect(401)).body.error.code).toBe('SESSION_EXPIRED');
    });
  });
});
