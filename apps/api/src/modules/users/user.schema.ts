import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** An organiser who can log in (Database Design §8.1). Not wedding data: no tenant guard. */
@Schema({ collection: 'users', timestamps: true })
export class User {
  /** Null until someone who signed in with an email code tells us their name (AUTH-05). */
  @Prop({ type: String, default: null, trim: true, maxlength: 60 })
  name!: string | null;

  @Prop({ type: String, required: true, lowercase: true, trim: true, maxlength: 254 })
  email!: string;

  @Prop({ type: String, default: null })
  googleId!: string | null;

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  /** Set by Google sign-in or a correct email code. */
  @Prop({ type: Date, required: true })
  emailVerifiedAt!: Date;

  @Prop({ type: Date, default: null })
  lastLoginAt!: Date | null;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } },
);
