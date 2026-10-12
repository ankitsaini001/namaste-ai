import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { User as UserDto } from '@mmm/shared';
import type { Model, Types } from 'mongoose';
import { User, type UserDocument } from './user.schema';

const DUPLICATE_KEY = 11000;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  findById(id: Types.ObjectId | string): Promise<UserDocument | null> {
    return this.users.findById(id);
  }

  /**
   * Finds the user for an email address that was just proven (a correct code), or creates them,
   * in one atomic step. Records the login time.
   */
  async signInWithVerifiedEmail(email: string, now = new Date()): Promise<UserDocument> {
    try {
      return await this.users.findOneAndUpdate(
        { email },
        {
          $setOnInsert: {
            email,
            name: null,
            googleId: null,
            avatarUrl: null,
            emailVerifiedAt: now,
          },
          $set: { lastLoginAt: now },
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      // Two first logins for the same email at once: the second becomes an update.
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        return (await this.users.findOneAndUpdate(
          { email },
          { $set: { lastLoginAt: now } },
          { new: true },
        ))!;
      }
      throw error;
    }
  }

  async updateName(id: Types.ObjectId, name: string): Promise<UserDocument | null> {
    return this.users.findByIdAndUpdate(id, { $set: { name } }, { new: true, runValidators: true });
  }

  /** The User shape the API returns (API Design §8.1). */
  toDto(user: UserDocument): UserDto {
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      hasGoogle: user.googleId !== null,
    };
  }
}
