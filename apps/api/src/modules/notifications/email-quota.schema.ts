import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** One day's email count (Database Design §14.3). */
@Schema({ collection: 'emailQuota', versionKey: false })
export class EmailQuota {
  /** The day in UTC, for example 2026-12-01. */
  @Prop({ type: String, required: true })
  _id!: string;

  /** Emails handed to the provider today. */
  @Prop({ type: Number, required: true, default: 0 })
  sent!: number;

  /** Of which priority 3 (bulk). */
  @Prop({ type: Number, required: true, default: 0 })
  bulkSent!: number;

  @Prop({ type: Number, required: true })
  dailyLimit!: number;

  /** Slots kept for priority 1 (login codes, organiser invitations). */
  @Prop({ type: Number, required: true })
  reserved!: number;

  @Prop({ type: Date, required: true })
  createdAt!: Date;
}

export const EmailQuotaSchema = SchemaFactory.createForClass(EmailQuota);
EmailQuotaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
