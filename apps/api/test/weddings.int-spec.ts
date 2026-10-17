import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { addYears, meSchema, todayInIst, weddingSchema } from '@mmm/shared';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/modules/auth/auth.module';
import { EventsModule } from '../src/modules/events/events.module';
import { AlbumsService } from '../src/modules/gallery/albums.service';
import { SessionsService } from '../src/modules/session/sessions.service';
import { UsersService } from '../src/modules/users/users.service';
import { WeddingsModule } from '../src/modules/weddings/weddings.module';
import { testMongoUri } from './support/test-db';

const WEB_ORIGIN = 'http://localhost:3000';
let counter = 0;

describe('wedding setup (WED-01 to WED-06, WED-09)', () => {
  let app: INestApplication;
  let db: Connection;

  /** A signed-in user with a session cookie, created directly (login itself is tested elsewhere). */
  const newUser = async ({ named = true } = {}) => {
    const email = `organiser${++counter}.${Date.now()}@example.com`;
    const users = app.get(UsersService);
    const user = await users.signInWithVerifiedEmail(email);
    if (named) await users.updateName(user._id, 'Princi Sharma');
    const { token } = await app.get(SessionsService).createForUser(user._id, {});
    return { email, cookie: `mmm_session=${token}` };
  };
  const post = (path: string, cookie: string, body: object) =>
    request(app.getHttpServer())
      .post(`/v1${path}`)
      .set('Origin', WEB_ORIGIN)
      .set('Cookie', cookie)
      .send(body);
  const get = (path: string, cookie?: string) => {
    const req = request(app.getHttpServer()).get(`/v1${path}`);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  const weddingDay = addYears(todayInIst(), 1);
  const input = (overrides: object = {}) => ({
    brideName: 'Princi',
    groomName: 'Akshay',
    title: 'Princi & Akshay',
    date: weddingDay,
    city: 'Dehradun',
    description: null,
    slug: `princi-akshay-${++counter}`,
    events: [
      // Deliberately out of order: the API sorts by start time.
      { type: 'wedding', name: 'Wedding', startsAt: `${weddingDay}T13:30:00.000Z` },
      {
        type: 'mehendi',
        name: 'Mehendi',
        startsAt: `${weddingDay}T05:00:00.000Z`,
        showOnWebsite: false,
      },
    ],
    ...overrides,
  });

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
        WeddingsModule,
        EventsModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: WEB_ORIGIN });
    await app.init();
    db = app.get(getConnectionToken());
    await db.syncIndexes();
  });

  afterAll(async () => {
    await db.dropDatabase();
    await app.close();
  });

  describe('POST /v1/wedding', () => {
    it('creates the wedding, an Admin membership, the ceremonies and their albums together', async () => {
      const { cookie, email } = await newUser();
      const body = input();
      const res = await post('/wedding', cookie, body).expect(201);

      const wedding = weddingSchema.parse(res.body.data);
      expect(wedding).toMatchObject({
        brideName: 'Princi',
        title: 'Princi & Akshay',
        date: `${weddingDay}T00:00:00.000Z`,
        slug: body.slug,
        slugLocked: false,
        setupStep: 'done',
        photoCount: 0,
        photoLimit: 2000,
      });
      expect(wedding.galleryCode).toMatch(/^[2-9A-HJKMNP-Z]{10}$/);
      expect(wedding.groups.map((g) => g.name)).toEqual([
        'Family',
        'Friends',
        'Office',
        'Neighbours',
        "Bride's side",
        "Groom's side",
      ]);

      const stored = (await db.collection('weddings').findOne({ slug: body.slug }))!;
      expect(stored.website).toMatchObject({ theme: 'classic_indian', published: false });
      expect(stored.invitationDesign.designId).toBe('royal_red');
      expect(stored.budget).toEqual({ total: null, categories: [] });
      expect(stored.settings.replyToEmail).toBe(email);
      // Guest uploads close 30 days after the wedding (UPL-08).
      expect(stored.settings.uploads.closesAt.getTime() - stored.date.getTime()).toBe(
        30 * 86_400_000,
      );

      const membership = await db.collection('memberships').findOne({ weddingId: stored._id });
      expect(membership?.role).toBe('admin');

      const albums = await db.collection('albums').find({ weddingId: stored._id }).toArray();
      const events = await db.collection('events').find({ weddingId: stored._id }).toArray();
      expect(albums.map((a) => a.name).sort()).toEqual(['General', 'Mehendi', 'Wedding']);
      for (const event of events) {
        expect(albums.find((a) => String(a._id) === String(event.albumId))?.eventId).toEqual(
          event._id,
        );
      }
    });

    it('returns the ceremonies sorted by start time, and the wedding and role in /me', async () => {
      const { cookie } = await newUser();
      await post('/wedding', cookie, input()).expect(201);

      const events = (await get('/events', cookie).expect(200)).body;
      expect(events.data.map((e: { name: string }) => e.name)).toEqual(['Mehendi', 'Wedding']);
      expect(events.data[0]).toMatchObject({ showOnWebsite: false, venueName: null });
      expect(events.page).toEqual({ nextCursor: null, hasMore: false });

      const me = meSchema.parse((await get('/me', cookie).expect(200)).body.data);
      expect(me.role).toBe('admin');
      expect(me.wedding).toMatchObject({
        title: 'Princi & Akshay',
        setupStep: 'done',
        isDemo: false,
      });
    });

    it('allows one wedding per user (WED-09), even for two requests at once', async () => {
      const { cookie } = await newUser();
      const results = await Promise.all([
        post('/wedding', cookie, input()),
        post('/wedding', cookie, input()),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)?.body.error.code).toBe('ALREADY_IN_WEDDING');

      const again = await post('/wedding', cookie, input()).expect(409);
      expect(again.body.error.code).toBe('ALREADY_IN_WEDDING');
    });

    it('refuses a website address that is taken, even for two requests at once', async () => {
      const slug = `taken-${Date.now()}`;
      const [a, b] = await Promise.all([newUser(), newUser()]);
      const results = await Promise.all([
        post('/wedding', a.cookie, input({ slug })),
        post('/wedding', b.cookie, input({ slug })),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(results.find((r) => r.status === 409)?.body.error).toMatchObject({
        code: 'SLUG_TAKEN',
        field: 'slug',
      });
    });

    it('saves nothing if any part fails', async () => {
      const { cookie } = await newUser();
      const body = input();
      const albums = app.get(AlbumsService);
      const spy = vi
        .spyOn(albums, 'createForNewWedding')
        .mockRejectedValueOnce(new Error('disk full'));
      await post('/wedding', cookie, body).expect(500);
      spy.mockRestore();

      expect(await db.collection('weddings').countDocuments({ slug: body.slug })).toBe(0);
      expect((await get('/me', cookie).expect(200)).body.data.wedding).toBeNull();
      // And the user can simply try again.
      await post('/wedding', cookie, body).expect(201);
    });

    it.each([
      ['a past date', { date: addYears(todayInIst(), -1) }, 'date'],
      ['a reserved address', { slug: 'admin' }, 'slug'],
      ['no ceremonies', { events: [] }, 'events'],
      [
        'an unnamed ceremony',
        { events: [{ type: 'custom', name: ' ', startsAt: `${weddingDay}T10:00:00.000Z` }] },
        'events[0].name',
      ],
    ])('rejects %s with VALIDATION_FAILED on the right field', async (_label, change, field) => {
      const { cookie } = await newUser();
      const res = await post('/wedding', cookie, input(change)).expect(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', field });
    });

    it('needs a signed-in user', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/wedding')
        .set('Origin', WEB_ORIGIN)
        .send(input())
        .expect(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('POST /v1/wedding needs a name', () => {
    it('asks for the organiser’s name first (AUTH-05), even when called directly', async () => {
      const { cookie } = await newUser({ named: false });
      const body = input();
      const res = await post('/wedding', cookie, body).expect(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', field: 'name' });
      expect(await db.collection('weddings').countDocuments({ slug: body.slug })).toBe(0);
    });
  });

  describe('GET /v1/wedding/slug-available', () => {
    it('says whether an address is free, and why not', async () => {
      const { cookie } = await newUser();
      const taken = input();
      await post('/wedding', cookie, taken).expect(201);

      const check = async (slug: string) =>
        (await get(`/wedding/slug-available?slug=${encodeURIComponent(slug)}`, cookie).expect(200))
          .body.data;
      expect(await check(`free-${Date.now()}`)).toEqual({ available: true, reason: null });
      expect(await check(taken.slug)).toEqual({ available: false, reason: 'taken' });
      expect(await check(taken.slug.toUpperCase())).toEqual({ available: false, reason: 'taken' });
      expect(await check('login')).toEqual({ available: false, reason: 'reserved' });
      expect(await check('No Spaces')).toEqual({ available: false, reason: 'invalid' });
    });
  });

  describe('wedding data access', () => {
    it('needs a wedding: NO_WEDDING before setup', async () => {
      const { cookie } = await newUser();
      expect((await get('/wedding', cookie).expect(403)).body.error.code).toBe('NO_WEDDING');
      expect((await get('/events', cookie).expect(403)).body.error.code).toBe('NO_WEDDING');
    });

    it('shows each organiser only their own wedding', async () => {
      const [a, b] = await Promise.all([newUser(), newUser()]);
      await post(
        '/wedding',
        a.cookie,
        input({
          title: 'Wedding A',
          events: [{ type: 'roka', name: 'A Roka', startsAt: `${weddingDay}T06:00:00.000Z` }],
        }),
      ).expect(201);
      await post(
        '/wedding',
        b.cookie,
        input({
          title: 'Wedding B',
          events: [{ type: 'haldi', name: 'B Haldi', startsAt: `${weddingDay}T06:00:00.000Z` }],
        }),
      ).expect(201);

      expect((await get('/wedding', a.cookie).expect(200)).body.data.title).toBe('Wedding A');
      expect(
        (await get('/events', a.cookie).expect(200)).body.data.map((e: { name: string }) => e.name),
      ).toEqual(['A Roka']);
      expect(
        (await get('/events', b.cookie).expect(200)).body.data.map((e: { name: string }) => e.name),
      ).toEqual(['B Haldi']);
    });
  });
});
