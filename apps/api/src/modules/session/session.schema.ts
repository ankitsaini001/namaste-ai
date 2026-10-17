import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';

export const SESSION_KINDS = ['user', 'demo', 'guest_upload'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

/** One logged-in browser (Database Design §8.4). Only a hash of the cookie value is stored. */
@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  @Prop({ type: String, required: true })
  tokenHash!: string;

  @Prop({ type: String, enum: SESSION_KINDS, required: true })
  kind!: SessionKind;

  @Prop({ type: Types.ObjectId, default: null })
  userId!: Types.ObjectId | null;

  /** For guest_upload sessions (the QR email check, later). */
  @Prop({ type: Types.ObjectId, default: null })
  weddingId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  guestId!: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  /** Updated at most once every 10 minutes. */
  @Prop({ type: Date, required: true })
  lastSeenAt!: Date;

  @Prop({ type: String, default: null })
  userAgent!: string | null;

  @Prop({ type: String, default: null })
  ip!: string | null;
}

export type SessionDocument = HydratedDocument<Session>;
export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ tokenHash: 1 }, { unique: true });
SessionSchema.index({ userId: 1 });
SessionSchema.index(
  { weddingId: 1, guestId: 1 },
  { partialFilterExpression: { kind: 'guest_upload' } },
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
