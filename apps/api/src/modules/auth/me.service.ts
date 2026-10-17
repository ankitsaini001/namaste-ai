import { HttpStatus, Injectable } from '@nestjs/common';
import type { Me } from '@mmm/shared';
import type { Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import { MembersService } from '../members/members.service';
import type { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';
import { WeddingsService } from '../weddings/weddings.service';

/** Builds the Me shape (API Design §8.2): the user, plus their wedding and role once they have one. */
@Injectable()
export class MeService {
  constructor(
    private readonly users: UsersService,
    private readonly members: MembersService,
    private readonly weddings: WeddingsService,
  ) {}

  async toMe(user: UserDocument): Promise<Me> {
    const membership = await this.members.findByUser(user._id);
    const wedding = membership ? await this.weddings.findById(membership.weddingId) : null;
    return {
      user: this.users.toDto(user),
      needsName: user.name === null,
      wedding: wedding ? this.weddings.toSummary(wedding) : null,
      role: wedding && membership ? membership.role : null,
    };
  }

  async forUser(userId: Types.ObjectId): Promise<Me> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'Please log in again.');
    }
    return this.toMe(user);
  }
}
