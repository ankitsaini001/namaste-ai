import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

/** One 6-digit email login code (Database Design §8.5). The code itself is never stored. */
@Schema({ collection: 'loginCodes', timestamps: true })
export class LoginCode {
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  /** HMAC-SHA256 of email and code, keyed with LOGIN_CODE_SECRET. */
  @Prop({ type: String, required: true })
  codeHash!: string;

  /** Wrong tries; the code is locked at 5. */
  @Prop({ type: Number, required: true, default: 0 })
  attempts!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  createdAt!: Date;
}

export type LoginCodeDocument = HydratedDocument<LoginCode>;
export const LoginCodeSchema = SchemaFactory.createForClass(LoginCode);

LoginCodeSchema.index({ email: 1, createdAt: -1 });
// Kept for an hour after expiry so the screen can say "expired" rather than "wrong code".
LoginCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 * 60 });
