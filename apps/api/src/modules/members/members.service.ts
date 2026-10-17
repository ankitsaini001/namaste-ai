import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { Membership, type MembershipDocument, type MemberRole } from './membership.schema';

@Injectable()
export class MembersService {
  constructor(@InjectModel(Membership.name) private readonly memberships: Model<Membership>) {}

  /**
   * The user's wedding membership, if any. Tenant-guard exemption (Database Design §16.1): at login
   * we know only the user, not yet their wedding. `userId` is unique, so this finds at most one.
   */
  findByUser(userId: Types.ObjectId): Promise<MembershipDocument | null> {
    return this.memberships.findOne({ userId }).setOptions({ skipTenantGuard: true });
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
}
