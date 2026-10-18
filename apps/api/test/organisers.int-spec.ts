import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { addYears, meSchema, organisersListSchema, todayInIst } from '@mmm/shared';
import { type Connection, Types } from 'mongoose';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AuthModule } from '../src/modules/auth/auth.module';
import { OrganisersModule } from '../src/modules/organisers/organisers.module';
import { SessionsService } from '../src/modules/session/sessions.service';
import { UsersService } from '../src/modules/users/users.service';
import { WeddingsModule } from '../src/modules/weddings/weddings.module';
import { testMongoUri } from './support/test-db';

const WEB_ORIGIN = 'http://localhost:3000';
let counter = 0;

describe('organisers (ORG-01 to ORG-10)', () => {
  let app: INestApplication;
  let db: Connection;

  const http = () => request(app.getHttpServer());
  const send = (
    method: 'post' | 'patch' | 'delete',
    path: string,
    cookie?: string,
    body?: object,
  ) => {
    const req = http()[method](`/v1${path}`).set('Origin', WEB_ORIGIN);
    if (cookie) req.set('Cookie', cookie);
    return body ? req.send(body) : req;
  };
  const get = (path: string, cookie?: string) => {
    const req = http().get(`/v1${path}`);
    return cookie ? req.set('Cookie', cookie) : req;
  };

  /** A signed-in user (login itself is tested elsewhere). */
  const newUser = async ({ name = 'Rohit Sharma' as string | null, email = '' } = {}) => {
    const address = email || `person${++counter}.${Date.now()}@example.com`;
    const users = app.get(UsersService);
    const user = await users.signInWithVerifiedEmail(address);
    if (name) await users.updateName(user._id, name);
    const { token } = await app.get(SessionsService).createForUser(user._id, {});
    return { id: String(user._id), email: address, cookie: `mmm_session=${token}` };
  };

  /** A user who has created a wedding, so they are its Admin. */
  const newAdmin = async () => {
    const admin = await newUser({ name: 'Princi Sharma' });
    const day = addYears(todayInIst(), 1);
    await send('post', '/wedding', admin.cookie, {
      brideName: 'Princi',
      groomName: 'Akshay',
      title: 'Princi & Akshay',
      date: day,
      city: 'Dehradun',
      slug: `princi-akshay-${++counter}`,
      events: [{ type: 'wedding', name: 'Wedding', startsAt: `${day}T13:30:00.000Z` }],
    }).expect(201);
    return admin;
  };

  const invite = (cookie: string, email: string, role: 'admin' | 'manager' = 'manager') =>
    send('post', '/organisers/invites', cookie, { name: 'Rohit Sharma', email, role });

  /** The join token from the newest invitation email to this address (no worker runs in tests). */
  const joinToken = async (email: string) => {
    const [record] = await db
      .collection('emails')
      .find({ to: email, kind: 'organiser_invite' })
      .sort({ _id: -1 })
      .limit(1)
      .toArray();
    return String(record!.templateData.joinUrl).split('/join/')[1]!;
  };

  /** Invites someone and has them join; returns them signed in as an organiser. */
  const addOrganiser = async (admin: { cookie: string }, role: 'admin' | 'manager' = 'manager') => {
    const person = await newUser();
    await invite(admin.cookie, person.email, role).expect(201);
    await send('post', `/join/${await joinToken(person.email)}`, person.cookie).expect(200);
    return person;
  };

  const list = async (cookie: string) =>
    organisersListSchema.parse((await get('/organisers', cookie).expect(200)).body.data);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ LOGIN_CODE_SECRET: 's'.repeat(40), COOKIE_SECURE: true, WEB_ORIGIN })],
        }),
        MongooseModule.forRoot(testMongoUri()),
        AuthModule,
        WeddingsModule,
        OrganisersModule,
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

  describe('inviting and joining', () => {
    it('emails a 7-day join link and stores only its hash (ORG-01, ORG-02)', async () => {
      const admin = await newAdmin();
      const res = await invite(admin.cookie, 'Rohit.New@Example.com').expect(201);
      expect(res.body.data).toMatchObject({
        name: 'Rohit Sharma',
        email: 'rohit.new@example.com',
        role: 'manager',
        invitedByName: 'Princi Sharma',
        expired: false,
      });
      const days = (Date.parse(res.body.data.expiresAt) - Date.parse(res.body.data.sentAt)) / 864e5;
      expect(days).toBe(7);

      const token = await joinToken('rohit.new@example.com');
      const stored = await db
        .collection('organiserInvites')
        .findOne({ email: 'rohit.new@example.com' });
      expect(JSON.stringify(stored)).not.toContain(token);
      expect((await list(admin.cookie)).invites).toHaveLength(1);
    });

    it('shows the join page details without signing in, with the email partly hidden', async () => {
      const admin = await newAdmin();
      await invite(admin.cookie, 'rohit.page@example.com').expect(201);
      const res = await get(`/join/${await joinToken('rohit.page@example.com')}`).expect(200);
      expect(res.body.data).toMatchObject({
        weddingTitle: 'Princi & Akshay',
        inviterName: 'Princi Sharma',
        invitedName: 'Rohit Sharma',
        role: 'manager',
        emailHint: 'r•••@example.com',
      });
      expect((await get('/join/not-a-real-token').expect(404)).body.error.code).toBe(
        'JOIN_LINK_INVALID',
      );
    });

    it('joins the wedding with the invited email and returns the new Me (ORG-03)', async () => {
      const admin = await newAdmin();
      const rohit = await newUser();
      await invite(admin.cookie, rohit.email).expect(201);
      const res = await send('post', `/join/${await joinToken(rohit.email)}`, rohit.cookie).expect(
        200,
      );
      const me = meSchema.parse(res.body.data);
      expect(me.role).toBe('manager');
      expect(me.wedding?.title).toBe('Princi & Akshay');

      const after = await list(admin.cookie);
      expect(after.organisers.map((o) => o.role)).toEqual(['admin', 'manager']);
      expect(after.invites).toHaveLength(0);
    });

    it('refuses a different email, saying which one to use (ORG-03)', async () => {
      const admin = await newAdmin();
      await invite(admin.cookie, 'rohit.right@example.com').expect(201);
      const other = await newUser();
      const res = await send(
        'post',
        `/join/${await joinToken('rohit.right@example.com')}`,
        other.cookie,
      ).expect(403);
      expect(res.body.error).toMatchObject({
        code: 'JOIN_EMAIL_MISMATCH',
        details: { invitedEmailHint: 'r•••@example.com' },
      });
    });

    it('refuses someone already planning another wedding (ORG-04)', async () => {
      const first = await newAdmin();
      // Known to be in another wedding: refused when inviting.
      const other = await newAdmin();
      const res = await invite(first.cookie, other.email).expect(409);
      expect(res.body.error).toMatchObject({ code: 'ALREADY_IN_WEDDING', field: 'email' });

      // Started their own wedding after being invited: refused when joining.
      const rohit = await newUser();
      await invite(first.cookie, rohit.email).expect(201);
      const token = await joinToken(rohit.email);
      const day = addYears(todayInIst(), 1);
      await send('post', '/wedding', rohit.cookie, {
        brideName: 'Meera',
        groomName: 'Rohit',
        title: 'Meera & Rohit',
        date: day,
        city: 'Pune',
        slug: `meera-rohit-${++counter}`,
        events: [{ type: 'wedding', name: 'Wedding', startsAt: `${day}T13:30:00.000Z` }],
      }).expect(201);
      expect((await send('post', `/join/${token}`, rohit.cookie).expect(409)).body.error.code).toBe(
        'ALREADY_IN_WEDDING',
      );
    });

    it('needs a name before joining', async () => {
      const admin = await newAdmin();
      const nameless = await newUser({ name: null });
      await invite(admin.cookie, nameless.email).expect(201);
      const res = await send(
        'post',
        `/join/${await joinToken(nameless.email)}`,
        nameless.cookie,
      ).expect(400);
      expect(res.body.error).toMatchObject({ code: 'VALIDATION_FAILED', field: 'name' });
    });

    it('treats an expired, cancelled or replaced link as no longer working', async () => {
      const admin = await newAdmin();
      const rohit = await newUser();
      const created = (await invite(admin.cookie, rohit.email).expect(201)).body.data;
      const firstToken = await joinToken(rohit.email);

      // Resending replaces the link: the old one stops working, the new one works.
      await send('post', `/organisers/invites/${created.id}/resend`, admin.cookie).expect(200);
      const secondToken = await joinToken(rohit.email);
      expect(secondToken).not.toBe(firstToken);
      expect((await get(`/join/${firstToken}`).expect(404)).body.error.code).toBe(
        'JOIN_LINK_INVALID',
      );

      await db
        .collection('organiserInvites')
        .updateOne({ email: rohit.email }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await get(`/join/${secondToken}`).expect(410)).body.error.code).toBe(
        'JOIN_LINK_EXPIRED',
      );
      expect((await list(admin.cookie)).invites[0]?.expired).toBe(true);

      await send('delete', `/organisers/invites/${created.id}`, admin.cookie).expect(204);
      await send('post', `/join/${secondToken}`, rohit.cookie).expect(410);
      expect((await list(admin.cookie)).invites).toHaveLength(0);
    });

    it('sends the same invitation again when someone is invited twice, with the new role', async () => {
      const admin = await newAdmin();
      await invite(admin.cookie, 'twice@example.com', 'manager').expect(201);
      await invite(admin.cookie, 'twice@example.com', 'admin').expect(201);
      const { invites } = await list(admin.cookie);
      expect(invites).toHaveLength(1);
      expect(invites[0]?.role).toBe('admin');
      expect(await db.collection('emails').countDocuments({ to: 'twice@example.com' })).toBe(2);
    });

    it('refuses to invite someone who is already an organiser here', async () => {
      const admin = await newAdmin();
      const rohit = await addOrganiser(admin);
      const res = await invite(admin.cookie, rohit.email).expect(409);
      expect(res.body.error.message).toMatch(/already an organiser of this wedding/);
    });

    it('allows at most 20 organisers, counting pending invitations (ORG-10)', async () => {
      const admin = await newAdmin();
      for (let i = 0; i < 19; i++)
        await invite(admin.cookie, `limit${i}.${counter}@example.com`).expect(201);
      const res = await invite(admin.cookie, `limit-over.${counter}@example.com`).expect(422);
      expect(res.body.error).toMatchObject({
        code: 'LIMIT_REACHED',
        details: { limit: 20, resource: 'organisers' },
      });
    });
  });

  describe('roles', () => {
    it('lets Managers see organisers but not change them (PRD §28)', async () => {
      const admin = await newAdmin();
      const manager = await addOrganiser(admin);
      expect((await list(manager.cookie)).organisers).toHaveLength(2);

      for (const attempt of [
        () => invite(manager.cookie, 'nope@example.com'),
        () => send('patch', `/organisers/${admin.id}`, manager.cookie, { role: 'manager' }),
        () => send('delete', `/organisers/${admin.id}`, manager.cookie),
        () => send('post', '/wedding/setup-step', manager.cookie, { step: 'done' }),
      ]) {
        expect((await attempt().expect(403)).body.error.code).toBe('FORBIDDEN');
      }
    });

    it('keeps at least one Admin (ORG-07)', async () => {
      const admin = await newAdmin();
      const res = await send('patch', `/organisers/${admin.id}`, admin.cookie, {
        role: 'manager',
      }).expect(422);
      expect(res.body.error.code).toBe('LAST_ADMIN');

      // With a second Admin, the first can step down.
      const second = await addOrganiser(admin, 'admin');
      await send('patch', `/organisers/${admin.id}`, admin.cookie, { role: 'manager' }).expect(200);
      const roles = (await list(second.cookie)).organisers.map((o) => o.role);
      expect(roles).toEqual(['manager', 'admin']);
    });

    it('never ends up with no Admin, even when two Admins step down at once', async () => {
      const admin = await newAdmin();
      const second = await addOrganiser(admin, 'admin');
      const results = await Promise.all([
        send('patch', `/organisers/${admin.id}`, admin.cookie, { role: 'manager' }),
        send('patch', `/organisers/${second.id}`, second.cookie, { role: 'manager' }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 422]);
      const admins = await db.collection('memberships').countDocuments({
        role: 'admin',
        userId: { $in: [admin.id, second.id].map((id) => new Types.ObjectId(id)) },
      });
      expect(admins).toBe(1);
    });

    it('removing someone ends their sessions at once (ORG-08)', async () => {
      const admin = await newAdmin();
      const rohit = await addOrganiser(admin);
      await get('/wedding', rohit.cookie).expect(200);
      await send('delete', `/organisers/${rohit.id}`, admin.cookie).expect(204);
      expect((await get('/wedding', rohit.cookie).expect(401)).body.error.code).toBe(
        'SESSION_EXPIRED',
      );
      expect((await list(admin.cookie)).organisers).toHaveLength(1);

      // Not yourself, and not someone outside the wedding.
      await send('delete', `/organisers/${admin.id}`, admin.cookie).expect(403);
      await send('delete', `/organisers/${rohit.id}`, admin.cookie).expect(404);
    });

    it('lets a Manager leave, but not an Admin (ORG-09)', async () => {
      const admin = await newAdmin();
      const manager = await addOrganiser(admin);
      await send('post', '/organisers/leave', admin.cookie).expect(403);
      await send('post', '/organisers/leave', manager.cookie).expect(204);
      expect((await get('/wedding', manager.cookie).expect(403)).body.error.code).toBe(
        'NO_WEDDING',
      );
    });

    it('keeps each wedding’s organisers to itself', async () => {
      const a = await newAdmin();
      const b = await newAdmin();
      const rohit = await addOrganiser(a);
      const pending = (await invite(a.cookie, `pending.${counter}@example.com`).expect(201)).body
        .data;

      expect((await list(b.cookie)).organisers.map((o) => o.userId)).not.toContain(rohit.id);
      await send('delete', `/organisers/${rohit.id}`, b.cookie).expect(404);
      await send('patch', `/organisers/${rohit.id}`, b.cookie, { role: 'admin' }).expect(404);
      await send('delete', `/organisers/invites/${pending.id}`, b.cookie).expect(404);
      await send('post', `/organisers/invites/${pending.id}/resend`, b.cookie).expect(404);
    });
  });

  describe('setup step 3', () => {
    it('starts at "organisers" and only moves forward', async () => {
      const admin = await newAdmin();
      expect((await get('/wedding', admin.cookie).expect(200)).body.data.setupStep).toBe(
        'organisers',
      );
      await send('post', '/wedding/setup-step', admin.cookie, { step: 'done' }).expect(200);
      const back = await send('post', '/wedding/setup-step', admin.cookie, {
        step: 'details',
      }).expect(200);
      expect(back.body.data.setupStep).toBe('done');
    });
  });
});
