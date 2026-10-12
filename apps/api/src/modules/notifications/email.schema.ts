import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const EMAIL_KINDS = [
  'invitation',
  'reminder',
  'rsvp_confirmation',
  'link_request',
  'organiser_invite',
  'login_code',
  'payment_digest',
  'photos_ready',
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const EMAIL_STATUSES = [
  'queued',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'failed',
  'skipped',
  'postponed',
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** 1 = always (uses the reserved slots), 2 = high, 3 = bulk (System Design §13.3). */
export type EmailPriority = 1 | 2 | 3;

export const PRIORITY_BY_KIND: Record<EmailKind, EmailPriority> = {
  login_code: 1,
  organiser_invite: 1,
  rsvp_confirmation: 2,
  link_request: 2,
  payment_digest: 2,
  photos_ready: 2,
  invitation: 3,
  reminder: 3,
};

/** One email sent or to be sent (Database Design §14.1). */
@Schema({ collection: 'emails', timestamps: true })
export class Email {
  /** Null for emails that belong to no wedding, such as login codes. */
  @Prop({ type: Types.ObjectId, default: null })
  weddingId!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  guestId!: Types.ObjectId | null;

  @Prop({ type: String, enum: EMAIL_KINDS, required: true })
  kind!: EmailKind;

  @Prop({ type: Number, enum: [1, 2, 3], required: true })
  priority!: EmailPriority;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  to!: string;

  /** Values filled into the template. Never secrets, except a login code until it is sent. */
  @Prop({ type: MongooseSchema.Types.Mixed, required: true, default: {} })
  templateData!: Record<string, unknown>;

  /** Unique: the same action can never send the same email twice. */
  @Prop({ type: String, required: true })
  idempotencyKey!: string;

  @Prop({ type: Types.ObjectId, default: null })
  blockJobId!: Types.ObjectId | null;

  @Prop({ type: String, enum: EMAIL_STATUSES, required: true, default: 'queued' })
  status!: EmailStatus;

  @Prop({ type: String, default: null })
  providerMessageId!: string | null;

  @Prop({ type: Number, required: true, default: 0 })
  attempts!: number;

  @Prop({ type: String, default: null })
  lastError!: string | null;

  @Prop({ type: Date, default: null })
  sentAt!: Date | null;
}

export type EmailDocument = HydratedDocument<Email>;
export const EmailSchema = SchemaFactory.createForClass(Email);

EmailSchema.index({ idempotencyKey: 1 }, { unique: true });
EmailSchema.index(
  { providerMessageId: 1 },
  { unique: true, partialFilterExpression: { providerMessageId: { $type: 'string' } } },
);
EmailSchema.index({ weddingId: 1, guestId: 1, createdAt: -1 });
EmailSchema.index({ blockJobId: 1, status: 1 });
EmailSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
