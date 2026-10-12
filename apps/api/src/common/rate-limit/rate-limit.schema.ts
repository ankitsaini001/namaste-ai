import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** One "how many times recently" counter (Database Design §14.6). Deleted when its window ends. */
@Schema({ collection: 'rateLimits', versionKey: false })
export class RateLimit {
  /** `{rule}:{subject}:{window}` */
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: Number, required: true })
  count!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const RateLimitSchema = SchemaFactory.createForClass(RateLimit);
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
