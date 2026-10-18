import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import { tenantGuard } from '../../database/plugins/tenant-guard.plugin';
import { MEMBER_ROLES, type MemberRole } from '../members/membership.schema';

/** Unaccepted invites are deleted this long after they expire (Database Design §8.3). */
const KEEP_AFTER_EXPIRY_SECONDS = 30 * 24 * 60 * 60;

/** One invitation to help plan a wedding (Database Design §8.3). */
@Schema({ collection: 'organiserInvites', timestamps: true })
export class OrganiserInvite {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId!: Types.ObjectId;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, required: true, minlength: 1, maxlength: 60 })
  invitedName!: string;

  @Prop({ type: String, enum: MEMBER_ROLES, required: true })
  role!: MemberRole;

  @Prop({ type: Types.ObjectId, required: true })
  invitedBy!: Types.ObjectId;

  /** Who sent the latest email: a different Admin may resend it. */
  @Prop({ type: Types.ObjectId, default: null })
  sentBy!: Types.ObjectId | null;

  /** SHA-256 of the token in the join link; the token itself is never stored. */
  @Prop({ type: String, required: true })
  tokenHash!: string;

  /** 7 days after the latest send (ORG-02). */
  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Date, default: null })
  acceptedAt!: Date | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  createdAt!: Date;
}

export type OrganiserInviteDocument = HydratedDocument<OrganiserInvite>;
export const OrganiserInviteSchema = SchemaFactory.createForClass(OrganiserInvite);

OrganiserInviteSchema.index({ tokenHash: 1 }, { unique: true });
OrganiserInviteSchema.index({ weddingId: 1, email: 1 });
OrganiserInviteSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: KEEP_AFTER_EXPIRY_SECONDS,
    partialFilterExpression: { acceptedAt: { $type: 'null' } },
  },
);
OrganiserInviteSchema.plugin(tenantGuard);
