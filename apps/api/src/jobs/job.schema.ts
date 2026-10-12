import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Schema as MongooseSchema } from 'mongoose';

/** Job types (Database Design §14.4). Each gets a handler as its feature is built. */
export const JOB_TYPES = [
  'send_email_block',
  'send_email',
  'send_payment_digest',
  'build_export',
  'revalidate_site',
  'delete_wedding',
  'reset_demo',
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ['queued', 'running', 'done', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** One background task for the worker. Finished jobs delete themselves after 14 days. */
@Schema({ collection: 'jobs', timestamps: true })
export class Job {
  @Prop({ type: String, enum: JOB_TYPES, required: true })
  type!: JobType;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ type: String, enum: JOB_STATUSES, required: true, default: 'queued' })
  status!: JobStatus;

  @Prop({ type: Date, required: true })
  runAt!: Date;

  @Prop({ type: Number, required: true, default: 0 })
  attempts!: number;

  @Prop({ type: Number, required: true, default: 5 })
  maxAttempts!: number;

  @Prop({ type: String, default: null })
  lockedBy!: string | null;

  @Prop({ type: Date, default: null })
  lockedUntil!: Date | null;

  @Prop({ type: String, default: null })
  lastError!: string | null;

  /** Unique when set: a second job with the same key is not created. */
  @Prop({ type: String, default: null })
  dedupeKey!: string | null;

  @Prop({ type: Date, default: null })
  finishedAt!: Date | null;
}

export type JobDocument = HydratedDocument<Job>;
export const JobSchema = SchemaFactory.createForClass(Job);

JobSchema.index({ status: 1, runAt: 1 });
JobSchema.index({ status: 1, lockedUntil: 1 }, { partialFilterExpression: { status: 'running' } });
JobSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } },
);
JobSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });
