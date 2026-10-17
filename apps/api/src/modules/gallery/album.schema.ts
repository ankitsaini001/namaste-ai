import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import { tenantGuard } from '../../database/plugins/tenant-guard.plugin';

export const ALBUM_VISIBILITIES = ['auto', 'shared', 'hidden'] as const;

/** One photo album: one per ceremony plus "General" (Database Design §13.2). */
@Schema({ collection: 'albums', timestamps: true })
export class Album {
  @Prop({ type: Types.ObjectId, required: true })
  weddingId!: Types.ObjectId;

  /** null = the "General" album. */
  @Prop({ type: Types.ObjectId, default: null })
  eventId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 40 })
  name!: string;

  /** auto follows the ceremony's privacy: shared if on the website, hidden if private. */
  @Prop({ type: String, enum: ALBUM_VISIBILITIES, required: true, default: 'auto' })
  visibility!: (typeof ALBUM_VISIBILITIES)[number];

  /** Ready photos, for album covers. */
  @Prop({ type: Number, required: true, default: 0 })
  photoCount!: number;

  @Prop({ type: Types.ObjectId, default: null })
  coverPhotoId!: Types.ObjectId | null;
}

export type AlbumDocument = HydratedDocument<Album>;
export const AlbumSchema = SchemaFactory.createForClass(Album);

// One album per ceremony, and one General album (eventId null) per wedding.
AlbumSchema.index({ weddingId: 1, eventId: 1 }, { unique: true });
AlbumSchema.plugin(tenantGuard);
