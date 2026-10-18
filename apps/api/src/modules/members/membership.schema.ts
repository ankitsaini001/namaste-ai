import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import { tenantGuard } from '../../database/plugins/tenant-guard.plugin';

export const MEMBER_ROLES = ['admin', 'manager'] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

/** An organiser's role in their wedding (Database Design §8.2). */
@Schema({ collection: 'memberships', timestamps: true })
export class Membership {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId!: Types.ObjectId;

  /** Unique: one wedding per user (WED-09). */
  @Prop({ type: Types.ObjectId, required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: MEMBER_ROLES, required: true })
  role!: MemberRole;

  @Prop({ type: Date, required: true })
  joinedAt!: Date;

  /** Who invited them; null for whoever created the wedding. */
  @Prop({ type: Types.ObjectId, default: null })
  invitedBy!: Types.ObjectId | null;

  /** The latest role change, by whom (owner's decision, 18 Oct 2026). */
  @Prop({ type: Types.ObjectId, default: null })
  roleChangedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  roleChangedAt!: Date | null;
}

export type MembershipDocument = HydratedDocument<Membership>;
export const MembershipSchema = SchemaFactory.createForClass(Membership);

MembershipSchema.index({ userId: 1 }, { unique: true });
MembershipSchema.index({ weddingId: 1, role: 1 });
MembershipSchema.plugin(tenantGuard);
