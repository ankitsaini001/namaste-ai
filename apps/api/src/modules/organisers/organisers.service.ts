import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  type InviteOrganiser,
  type JoinDetails,
  maskEmail,
  ORGANISER_RULES,
  type OrganiserInvite as OrganiserInviteDto,
  type OrganisersList,
} from '@mmm/shared';
import { createHash, randomBytes } from 'node:crypto';
import type { Connection, Model, Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import { RateLimitService } from '../../common/rate-limit/rate-limit.service';
import type { ApiEnv } from '../../config/env';
import { MembersService } from '../members/members.service';
import type { MemberRole } from '../members/membership.schema';
import { NotificationsService } from '../notifications/notifications.service';
import type { WeddingContext } from '../session/auth-context';
import { SessionsService } from '../session/sessions.service';
import { UsersService } from '../users/users.service';
import { WeddingsService } from '../weddings/weddings.service';
import { OrganiserInvite, type OrganiserInviteDocument } from './organiser-invite.schema';

const DAY_MS = 24 * 60 * 60_000;
const DUPLICATE_KEY = 11000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Organisers and their invitations (PRD §7, API Design §13.5–13.7). */
@Injectable()
export class OrganisersService {
  private readonly webOrigin: string;

  constructor(
    @InjectModel(OrganiserInvite.name) private readonly invites: Model<OrganiserInvite>,
    @InjectConnection() private readonly connection: Connection,
    private readonly members: MembersService,
    private readonly users: UsersService,
    private readonly weddings: WeddingsService,
    private readonly sessions: SessionsService,
    private readonly notifications: NotificationsService,
    private readonly rateLimits: RateLimitService,
    config: ConfigService<ApiEnv, true>,
  ) {
    this.webOrigin = config.get('WEB_ORIGIN', { infer: true });
  }

  /** Everyone in the wedding, then invitations not yet accepted or cancelled (ORG-05). */
  async list(auth: WeddingContext, now = new Date()): Promise<OrganisersList> {
    const [memberships, invites] = await Promise.all([
      this.members.listForWedding(auth.weddingId),
      this.openInvites(auth.weddingId),
    ]);
    const people = await this.users.findByIds([
      ...memberships.map((m) => m.userId),
      ...invites.map((i) => i.invitedBy),
    ]);
    const byId = new Map(people.map((user) => [String(user._id), user]));

    return {
      organisers: memberships.map((m) => {
        const user = byId.get(String(m.userId));
        return {
          userId: String(m.userId),
          name: user?.name ?? null,
          email: user?.email ?? '',
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
          isYou: m.userId.equals(auth.userId),
        };
      }),
      invites: invites.map((invite) =>
        this.toInviteDto(invite, byId.get(String(invite.invitedBy))?.name ?? null, now),
      ),
      limit: ORGANISER_RULES.maxOrganisers,
    };
  }

  /**
   * ORG-01, ORG-02, ORG-04, ORG-10. Inviting someone who already has a pending invitation sends it
   * again, with the new name and role.
   */
  async invite(
    auth: WeddingContext,
    input: InviteOrganiser,
    now = new Date(),
  ): Promise<OrganiserInviteDto> {
    const existingUser = await this.users.findByEmail(input.email);
    if (existingUser) {
      const membership = await this.members.findByUser(existingUser._id);
      if (membership?.weddingId.equals(auth.weddingId)) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'ALREADY_IN_WEDDING',
          `${existingUser.name ?? input.name} is already an organiser of this wedding.`,
          'email',
        );
      }
      if (membership) {
        throw new AppException(
          HttpStatus.CONFLICT,
          'ALREADY_IN_WEDDING',
          'That person already plans another wedding. Each account can plan one wedding.',
          'email',
        );
      }
    }

    let invite = await this.invites.findOne({
      weddingId: auth.weddingId,
      email: input.email,
      acceptedAt: null,
      cancelledAt: null,
    });
    if (invite) {
      invite.invitedName = input.name;
      invite.role = input.role;
    } else {
      await this.assertRoom(auth.weddingId, now);
      invite = new this.invites({
        weddingId: auth.weddingId,
        email: input.email,
        invitedName: input.name,
        role: input.role,
        invitedBy: auth.userId,
      });
    }
    return this.send(invite, auth, now);
  }

  /** ORG-05: a new link valid for another 7 days; the old link stops working. */
  async resend(auth: WeddingContext, inviteId: string, now = new Date()) {
    const invite = await this.invites.findOne({
      _id: inviteId,
      weddingId: auth.weddingId,
      acceptedAt: null,
      cancelledAt: null,
    });
    if (!invite) throw inviteNotFound();
    return this.send(invite, auth, now);
  }

  /** ORG-05. */
  async cancel(auth: WeddingContext, inviteId: string, now = new Date()): Promise<void> {
    const result = await this.invites.updateOne(
      { _id: inviteId, weddingId: auth.weddingId, acceptedAt: null, cancelledAt: null },
      { $set: { cancelledAt: now } },
    );
    if (result.matchedCount === 0) throw inviteNotFound();
  }

  /** ORG-06, ORG-07. */
  async changeRole(auth: WeddingContext, userId: Types.ObjectId, role: MemberRole) {
    await this.members.changeRole(auth.weddingId, userId, role);
  }

  /** ORG-06, ORG-08: they lose access at once, on every device. */
  async remove(auth: WeddingContext, userId: Types.ObjectId): Promise<void> {
    if (userId.equals(auth.userId)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'You can’t remove yourself. To leave, change your role to Manager, then leave the wedding.',
      );
    }
    await this.members.remove(auth.weddingId, userId);
    // Tasks and shopping items assigned to them are unassigned once those features exist.
    await this.sessions.revokeAllForUser(userId);
  }

  /** ORG-09: Managers can leave. An Admin steps down to Manager first, so an Admin always remains. */
  async leave(auth: WeddingContext): Promise<void> {
    if (auth.role !== 'manager') {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Admins can’t leave. Make someone else an Admin, change your role to Manager, then leave.',
      );
    }
    await this.members.remove(auth.weddingId, auth.userId);
  }

  /** What the join page shows before anyone signs in (UX brief, Screen 4). */
  async joinDetails(token: string, now = new Date()): Promise<JoinDetails> {
    const invite = await this.findUsable(token, now);
    const [wedding, inviter] = await Promise.all([
      this.weddings.findById(invite.weddingId),
      this.users.findById(invite.invitedBy),
    ]);
    if (!wedding) throw linkInvalid();
    return {
      weddingTitle: wedding.title,
      inviterName: inviter?.name ?? null,
      invitedName: invite.invitedName,
      role: invite.role,
      emailHint: maskEmail(invite.email),
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  /** ORG-03, ORG-04: joins the signed-in user to the wedding if they were invited with this email. */
  async accept(token: string, userId: Types.ObjectId, now = new Date()): Promise<void> {
    const invite = await this.findByToken(token);
    if (!invite || invite.cancelledAt) throw invite ? linkExpired() : linkInvalid();
    const user = await this.users.findById(userId);
    if (!user) throw linkInvalid();

    if (user.email !== invite.email) {
      const hint = maskEmail(invite.email);
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'JOIN_EMAIL_MISMATCH',
        `This invitation is for ${hint}. Log out and sign in with that email address.`,
        null,
        { invitedEmailHint: hint },
      );
    }

    const membership = await this.members.findByUser(userId);
    if (membership?.weddingId.equals(invite.weddingId)) return; // Already joined: nothing to do.
    if (membership) throw alreadyInAnotherWedding();
    if (invite.acceptedAt || invite.expiresAt <= now) throw linkExpired();
    if (!user.name?.trim()) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        'Please tell us your name before joining.',
        'name',
      );
    }
    if ((await this.members.countForWedding(invite.weddingId)) >= ORGANISER_RULES.maxOrganisers) {
      throw limitReached();
    }

    try {
      await this.connection.transaction(async (session) => {
        const claimed = await this.invites.updateOne(
          {
            _id: invite._id,
            weddingId: invite.weddingId,
            acceptedAt: null,
            cancelledAt: null,
            expiresAt: { $gt: now },
          },
          { $set: { acceptedAt: now } },
          { session },
        );
        if (claimed.matchedCount === 0) throw linkExpired();
        await this.members.add(invite.weddingId, userId, invite.role, session, now);
      });
    } catch (error) {
      // The user joined a wedding at the same moment (memberships.userId is unique).
      if ((error as { code?: number }).code === DUPLICATE_KEY) throw alreadyInAnotherWedding();
      throw error;
    }
  }

  private openInvites(weddingId: Types.ObjectId) {
    return this.invites
      .find({ weddingId, acceptedAt: null, cancelledAt: null })
      .sort({ createdAt: 1, _id: 1 });
  }

  /** ORG-10: at most 20 organisers, counting invitations that can still be accepted. */
  private async assertRoom(weddingId: Types.ObjectId, now: Date) {
    const [members, pending] = await Promise.all([
      this.members.countForWedding(weddingId),
      this.invites.countDocuments({
        weddingId,
        acceptedAt: null,
        cancelledAt: null,
        expiresAt: { $gt: now },
      }),
    ]);
    if (members + pending >= ORGANISER_RULES.maxOrganisers) throw limitReached();
  }

  /** Gives the invite a new link valid for 7 days and emails it. Only the link's hash is kept. */
  private async send(invite: OrganiserInviteDocument, auth: WeddingContext, now: Date) {
    await this.rateLimits.enforce(
      'organiser_invite_email',
      String(auth.weddingId),
      { limit: 30, windowSeconds: 60 * 60 },
      'You’ve sent a lot of invitations in the last hour. Please try again later.',
    );
    const [wedding, inviter] = await Promise.all([
      this.weddings.findById(auth.weddingId),
      this.users.findById(auth.userId),
    ]);
    const token = randomBytes(32).toString('base64url');
    invite.tokenHash = hashToken(token);
    invite.expiresAt = new Date(now.getTime() + ORGANISER_RULES.inviteDays * DAY_MS);
    await invite.save();

    await this.notifications.sendEmail({
      kind: 'organiser_invite',
      to: invite.email,
      templateData: {
        inviterName: inviter?.name ?? 'Someone',
        weddingTitle: wedding?.title ?? 'a wedding',
        role: invite.role,
        email: invite.email,
        joinUrl: `${this.webOrigin}/join/${token}`,
        expiresInDays: ORGANISER_RULES.inviteDays,
        expiresAt: invite.expiresAt.toISOString(),
      },
      // One email per link: a resend has a new expiry, so a new key.
      idempotencyKey: `organiser_invite:${String(invite._id)}:${invite.expiresAt.getTime()}`,
      weddingId: auth.weddingId,
    });
    return this.toInviteDto(invite, inviter?.name ?? null, now);
  }

  /**
   * Tenant-guard exemption (Database Design §16.1): the join link is all we know about the caller,
   * and the token hash is unique, so this finds at most one invitation.
   */
  private findByToken(token: string) {
    return this.invites
      .findOne({ tokenHash: hashToken(token) })
      .setOptions({ skipTenantGuard: true });
  }

  private async findUsable(token: string, now: Date) {
    const invite = await this.findByToken(token);
    if (!invite) throw linkInvalid();
    if (invite.acceptedAt || invite.cancelledAt || invite.expiresAt <= now) throw linkExpired();
    return invite;
  }

  private toInviteDto(
    invite: OrganiserInviteDocument,
    invitedByName: string | null,
    now: Date,
  ): OrganiserInviteDto {
    return {
      id: String(invite._id),
      name: invite.invitedName,
      email: invite.email,
      role: invite.role,
      invitedByName,
      sentAt: new Date(
        invite.expiresAt.getTime() - ORGANISER_RULES.inviteDays * DAY_MS,
      ).toISOString(),
      expiresAt: invite.expiresAt.toISOString(),
      expired: invite.expiresAt <= now,
    };
  }
}

function inviteNotFound(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    'That invitation was already accepted or cancelled.',
  );
}

function limitReached(): AppException {
  return new AppException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    'LIMIT_REACHED',
    `A wedding can have up to ${ORGANISER_RULES.maxOrganisers} organisers, including pending invitations.`,
    null,
    { limit: ORGANISER_RULES.maxOrganisers, resource: 'organisers' },
  );
}

function linkInvalid(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'JOIN_LINK_INVALID',
    'This invitation link isn’t valid. Check that you opened the whole link from the email.',
  );
}

function linkExpired(): AppException {
  return new AppException(
    HttpStatus.GONE,
    'JOIN_LINK_EXPIRED',
    'This invitation has expired, was cancelled or was already used. Ask the person who invited you to send a new one.',
  );
}

function alreadyInAnotherWedding(): AppException {
  return new AppException(
    HttpStatus.CONFLICT,
    'ALREADY_IN_WEDDING',
    'You already plan another wedding. Each account can plan one wedding.',
  );
}
