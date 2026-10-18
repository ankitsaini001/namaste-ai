import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { addYears, eventSchema, todayInIst } from '@mmm/shared';
import { type Connection, Types } from 'mongoose';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { EventsModule } from '../src/modules/events/events.module';
import { SessionsService } from '../src/modules/session/sessions.service';
import { UsersService } from '../src/modules/users/users.service';
import { WeddingsModule } from '../src/modules/weddings/weddings.module';
import { testMongoUri } from './support/test-db';

const WEB_ORIGIN = 'http://localhost:3000';
let counter = 0;

describe('ceremonies (EVT-01 to EVT-08)', () => {
  let app: INestApplication;
  let db: Connection;

  const send = (
    method: 'post' | 'patch' | 'delete',
    path: string,
    cookie: string,
    body?: object,
  ) => {
    const req = request(app.getHttpServer())
      [method](`/v1${path}`)
      .set('Origin', WEB_ORIGIN)
      .set('Cookie', cookie);
    return body ? req.send(body) : req;
  };
  const get = (path: string, cookie: string) =>
    request(app.getHttpServer()).get(`/v1${path}`).set('Cookie', cookie);

  const newUser = async (name = 'Princi Sharma') => {
    const users = app.get(UsersService);
    const user = await users.signInWithVerifiedEmail(
      `person${++counter}.${Date.now()}@example.com`,
    );
    await users.updateName(user._id, name);
    const { token } = await app.get(SessionsService).createForUser(user._id, {});
    return { id: user._id, cookie: `mmm_session=${token}` };
  };

  const day = addYears(todayInIst(), 1);
  /** An Admin whose wedding starts with one ceremony, the Wedding. */
  const newWedding = async () => {
    const admin = await newUser();
    const res = await send('post', '/wedding', admin.cookie, {
      brideName: 'Princi',
      groomName: 'Akshay',
      title: 'Princi & Akshay',
      date: day,
      city: 'Dehradun',
      slug: `princi-akshay-ev${++counter}`,
      events: [{ type: 'wedding', name: 'Wedding', startsAt: `${day}T13:30:00.000Z` }],
    }).expect(201);
    const events = (await get('/events', admin.cookie).expect(200)).body.data;
    return {
      ...admin,
      weddingId: res.body.data.id as string,
      weddingEventId: events[0].id as string,
    };
  };
  const sangeet = {
    type: 'sangeet',
    name: 'Sangeet',
    startsAt: `${day}T13:30:00.000Z`,
    endsAt: `${day}T19:30:00.000Z`,
    venueName: 'Royal Garden',
    address: 'Rajpur Road, Dehradun',
    mapUrl: 'https://maps.app.goo.gl/abc123',
    dressCode: 'Green / Traditional',
    livestreamUrl: 'https://youtu.be/live123',
  };
  const albums = (weddingId: string) =>
    db
      .collection('albums')
      .find({ weddingId: new Types.ObjectId(weddingId) })
      .toArray();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LOGIN_CODE_SECRET: 's'.repeat(40), COOKIE_SECURE: true, WEB_ORIGIN })],
        }),
        MongooseModule.forRoot(testMongoUri()),
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

  it('adds a ceremony with all its details and its own album (EVT-01, EVT-02, EVT-05)', async () => {
    const admin = await newWedding();
    const res = await send('post', '/events', admin.cookie, sangeet).expect(201);
    const event = eventSchema.parse(res.body.data);
    expect(event).toMatchObject({
      name: 'Sangeet',
      venueName: 'Royal Garden',
      // Worked out from the venue and address (owner's decision, 18 Oct 2026).
      mapEmbedQuery: 'Royal Garden, Rajpur Road, Dehradun',
      showOnWebsite: true,
      added: { by: 'Princi Sharma' },
      lastChanged: null,
    });
    const album = (await albums(admin.weddingId)).find((a) => String(a.eventId) === event.id);
    expect(album?.name).toBe('Sangeet');
    expect(String(album?._id)).toBe(event.albumId);
  });

  it('lists ceremonies by date and time, with who added them (EVT-03)', async () => {
    const admin = await newWedding();
    await send('post', '/events', admin.cookie, {
      type: 'haldi',
      name: 'Haldi',
      startsAt: `${day}T04:30:00.000Z`,
    }).expect(201);
    const list = (await get('/events', admin.cookie).expect(200)).body.data;
    expect(list.map((e: { name: string }) => e.name)).toEqual(['Haldi', 'Wedding']);
    // Setup's ceremonies record their creator too.
    expect(list[1].added.by).toBe('Princi Sharma');
  });

  it('changes only what is sent, records who changed it, and renames the album', async () => {
    const admin = await newWedding();
    const created = (await send('post', '/events', admin.cookie, sangeet).expect(201)).body.data;
    const rohit = await newUser('Rohit Sharma');
    await db.collection('memberships').insertOne({
      weddingId: new Types.ObjectId(admin.weddingId),
      userId: rohit.id,
      role: 'manager',
      joinedAt: new Date(),
    });

    // A Manager can change ceremonies too (PRD §28).
    const res = await send('patch', `/events/${created.id}`, rohit.cookie, {
      name: 'Sangeet Night',
      venueName: 'Hotel Saffron',
      showOnWebsite: false,
    }).expect(200);
    expect(res.body.data).toMatchObject({
      name: 'Sangeet Night',
      venueName: 'Hotel Saffron',
      address: 'Rajpur Road, Dehradun',
      mapEmbedQuery: 'Hotel Saffron, Rajpur Road, Dehradun',
      showOnWebsite: false,
      dressCode: 'Green / Traditional',
      added: { by: 'Princi Sharma' },
      lastChanged: { by: 'Rohit Sharma' },
    });
    const album = (await albums(admin.weddingId)).find((a) => String(a.eventId) === created.id);
    expect(album?.name).toBe('Sangeet Night');

    // Clearing a detail: empty means none.
    const cleared = await send('patch', `/events/${created.id}`, admin.cookie, {
      dressCode: '',
      endsAt: null,
    }).expect(200);
    expect(cleared.body.data).toMatchObject({ dressCode: null, endsAt: null });
  });

  it('checks the end against the start, including the one already saved', async () => {
    const admin = await newWedding();
    const created = (await send('post', '/events', admin.cookie, sangeet).expect(201)).body.data;
    const res = await send('patch', `/events/${created.id}`, admin.cookie, {
      startsAt: `${day}T20:00:00.000Z`,
    }).expect(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', field: 'endsAt' });

    for (const bad of [
      { mapUrl: 'not a link' },
      { livestreamUrl: 'https://vimeo.com/1' },
      { name: '' },
    ]) {
      await send('patch', `/events/${created.id}`, admin.cookie, bad).expect(400);
    }
  });

  it('deletes a ceremony and its album, but never the last one (EVT-06)', async () => {
    const admin = await newWedding();
    const created = (await send('post', '/events', admin.cookie, sangeet).expect(201)).body.data;

    const preview = await get(`/events/${created.id}?include=impact`, admin.cookie).expect(200);
    expect(preview.body.data.impact).toEqual({
      invitationsRemoved: 0,
      tasksUnlinked: 0,
      shoppingUnlinked: 0,
      expensesUnlinked: 0,
      vendorsUnlinked: 0,
      photosMovedToGeneral: 0,
    });

    const res = await send('delete', `/events/${created.id}`, admin.cookie).expect(200);
    expect(res.body.data).toMatchObject({ deleted: true, invitationsRemoved: 0 });
    expect((await albums(admin.weddingId)).map((a) => a.name).sort()).toEqual([
      'General',
      'Wedding',
    ]);
    await get(`/events/${created.id}`, admin.cookie).expect(404);

    const last = await send('delete', `/events/${admin.weddingEventId}`, admin.cookie).expect(422);
    expect(last.body.error).toMatchObject({
      code: 'LAST_EVENT',
      message: 'A wedding needs at least one ceremony. Add another ceremony first.',
    });
  });

  it('keeps one ceremony even when the last two are deleted at the same moment', async () => {
    const admin = await newWedding();
    const created = (await send('post', '/events', admin.cookie, sangeet).expect(201)).body.data;
    const results = await Promise.all([
      send('delete', `/events/${created.id}`, admin.cookie),
      send('delete', `/events/${admin.weddingEventId}`, admin.cookie),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 422]);
    expect((await get('/events', admin.cookie).expect(200)).body.data).toHaveLength(1);
  });

  it('allows at most 20 ceremonies (EVT-08)', async () => {
    const admin = await newWedding();
    for (let i = 0; i < 19; i++) {
      await send('post', '/events', admin.cookie, { ...sangeet, name: `Ceremony ${i}` }).expect(
        201,
      );
    }
    const res = await send('post', '/events', admin.cookie, sangeet).expect(422);
    expect(res.body.error).toMatchObject({
      code: 'LIMIT_REACHED',
      details: { limit: 20, resource: 'events' },
    });
  });

  it('keeps each wedding’s ceremonies to itself', async () => {
    const a = await newWedding();
    const b = await newWedding();
    await get(`/events/${a.weddingEventId}`, b.cookie).expect(404);
    await send('patch', `/events/${a.weddingEventId}`, b.cookie, { name: 'Mine now' }).expect(404);
    await send('delete', `/events/${a.weddingEventId}`, b.cookie).expect(404);
    const outsider = await newUser();
    expect(
      (await send('post', '/events', outsider.cookie, sangeet).expect(403)).body.error.code,
    ).toBe('NO_WEDDING');
  });
});
