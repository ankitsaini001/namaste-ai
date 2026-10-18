import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EVENT_TYPES, type EventType } from '@mmm/shared';
import { type HydratedDocument, Types } from 'mongoose';
import { tenantGuard } from '../../database/plugins/tenant-guard.plugin';

/** One ceremony (Database Design §9.2). The screens say "ceremony"; the code says "event". */
@Schema({ collection: 'events', timestamps: true })
export class WeddingEventRecord {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId!: Types.ObjectId;

  @Prop({ type: String, enum: EVENT_TYPES, required: true })
  type!: EventType;

  @Prop({ type: String, required: true, trim: true, maxlength: 40 })
  name!: string;

  @Prop({ type: Date, required: true })
  startsAt!: Date;

  @Prop({ type: Date, default: null })
  endsAt!: Date | null;

  @Prop({ type: String, default: null, maxlength: 80 })
  venueName!: string | null;

  @Prop({ type: String, default: null, maxlength: 200 })
  address!: string | null;

  @Prop({ type: String, default: null })
  mapUrl!: string | null;

  @Prop({ type: String, default: null })
  mapEmbedQuery!: string | null;

  @Prop({ type: String, default: null, maxlength: 500 })
  description!: string | null;

  @Prop({ type: String, default: null, maxlength: 80 })
  dressCode!: string | null;

  @Prop({ type: String, default: null })
  coverImageKey!: string | null;

  /** false = a private ceremony, seen only by invited guests (EVT-04). */
  @Prop({ type: Boolean, required: true, default: true })
  showOnWebsite!: boolean;

  @Prop({ type: String, default: null })
  livestreamUrl!: string | null;

  /** Created together with the ceremony (EVT-05). */
  @Prop({ type: Types.ObjectId, required: true })
  albumId!: Types.ObjectId;

  /** Who added it, and the latest change by whom (owner's decision, 18 Oct 2026). */
  @Prop({ type: Types.ObjectId, default: null })
  createdBy!: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  changedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  changedAt!: Date | null;

  createdAt!: Date;
}

export type WeddingEventDocument = HydratedDocument<WeddingEventRecord>;
export const WeddingEventSchema = SchemaFactory.createForClass(WeddingEventRecord);

WeddingEventSchema.index({ weddingId: 1, startsAt: 1 });
WeddingEventSchema.plugin(tenantGuard);
