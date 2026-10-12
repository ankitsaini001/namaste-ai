import { HttpStatus, Injectable } from '@nestjs/common';
import type { Me } from '@mmm/shared';
import type { Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import type { UserDocument } from '../users/user.schema';
import { UsersService } from '../users/users.service';

/** Builds the Me shape (API Design §8.2). Wedding and role arrive with wedding setup (WED). */
@Injectable()
export class MeService {
  constructor(private readonly users: UsersService) {}

  toMe(user: UserDocument): Me {
    return {
      user: this.users.toDto(user),
      needsName: user.name === null,
      wedding: null,
      role: null,
    };
  }

  async forUser(userId: Types.ObjectId): Promise<Me> {
    const user = await this.users.findById(userId);
    if (!user)
      throw new AppException(HttpStatus.UNAUTHORIZED, 'SESSION_EXPIRED', 'Please log in again.');
    return this.toMe(user);
  }
}
