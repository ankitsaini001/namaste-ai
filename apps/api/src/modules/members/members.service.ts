import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Connection, Model, Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import { Membership, type MembershipDocument, type MemberRole } from './membership.schema';

@Injectable()
export class MembersService {
  constructor(
    @InjectModel(Membership.name) private readonly memberships: Model<Membership>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /**
   * The user's wedding membership, if any. Tenant-guard exemption (Database Design §16.1): at login
   * we know only the user, not yet their wedding. `userId` is unique, so this finds at most one.
   */
  findByUser(userId: Types.ObjectId): Promise<MembershipDocument | null> {
    return this.memberships.findOne({ userId }).setOptions({ skipTenantGuard: true });
  }

  listForWedding(weddingId: Types.ObjectId): Promise<MembershipDocument[]> {
    return this.memberships.find({ weddingId }).sort({ joinedAt: 1, _id: 1 });
  }

  countForWedding(weddingId: Types.ObjectId): Promise<number> {
    return this.memberships.countDocuments({ weddingId });
  }

  findInWedding(weddingId: Types.ObjectId, userId: Types.ObjectId) {
    return this.memberships.findOne({ weddingId, userId });
  }

  async add(
    weddingId: Types.ObjectId,
    userId: Types.ObjectId,
    role: MemberRole,
    session: ClientSession,
    now = new Date(),
  ): Promise<void> {
    await this.memberships.create([{ weddingId, userId, role, joinedAt: now }], { session });
  }

  /** ORG-06. Throws NOT_FOUND if they aren't in this wedding, LAST_ADMIN if no Admin would be left. */
  async changeRole(weddingId: Types.ObjectId, userId: Types.ObjectId, role: MemberRole) {
    await this.withAdminCheck(weddingId, async (session) => {
      const result = await this.memberships.updateOne(
        { weddingId, userId },
        { $set: { role } },
        { session },
      );
      if (result.matchedCount === 0) throw notAnOrganiser();
    });
  }

  /** ORG-06, ORG-09: removes someone from the wedding, keeping at least one Admin (ORG-07). */
  async remove(weddingId: Types.ObjectId, userId: Types.ObjectId) {
    await this.withAdminCheck(weddingId, async (session) => {
      const result = await this.memberships.deleteOne({ weddingId, userId }, { session });
      if (result.deletedCount === 0) throw notAnOrganiser();
    });
  }

  /**
   * Runs a change in a transaction that fails if it leaves the wedding without an Admin (Database
   * Design §8.2). Every Admin membership is touched too, so two Admins demoting each other at the
   * same moment conflict, and the retried one sees the other's change, instead of both succeeding.
   */
  private async withAdminCheck(
    weddingId: Types.ObjectId,
    change: (session: ClientSession) => Promise<void>,
  ) {
    await this.connection.transaction(async (session) => {
      await this.memberships.updateMany(
        { weddingId, role: 'admin' },
        { $currentDate: { updatedAt: true } },
        { session },
      );
      await change(session);
      const admins = await this.memberships.countDocuments(
        { weddingId, role: 'admin' },
        { session },
      );
      if (admins === 0) {
        throw new AppException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'LAST_ADMIN',
          'A wedding needs at least one Admin. Make someone else an Admin first.',
        );
      }
    });
  }
}

function notAnOrganiser(): AppException {
  return new AppException(
    HttpStatus.NOT_FOUND,
    'NOT_FOUND',
    "We couldn't find that organiser in your wedding.",
  );
}
