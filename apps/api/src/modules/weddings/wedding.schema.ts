import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument, Types } from 'mongoose';
import { SETUP_STEPS } from '@mmm/shared';

/** Guest groups every wedding starts with (PRD GST-03). */
export const PRESET_GROUPS = [
  'Family',
  'Friends',
  'Office',
  'Neighbours',
  "Bride's side",
  "Groom's side",
] as const;

export const WEBSITE_THEMES = ['classic_indian', 'minimal_elegant', 'modern_celebration'] as const;
export const INVITATION_DESIGNS = [
  'royal_red',
  'floral_pastel',
  'marigold',
  'minimal_gold',
] as const;

@Schema({ _id: true, versionKey: false })
export class WeddingGroup {
  _id!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 40 })
  name!: string;
}

@Schema({ _id: false, versionKey: false })
export class BudgetCategory {
  @Prop({ type: String, required: true })
  category!: string;

  @Prop({ type: Number, required: true, min: 0 })
  planned!: number;
}

/** Budget (MON): an overall total and a planned amount per category. Empty at creation. */
@Schema({ _id: false, versionKey: false })
export class WeddingBudget {
  @Prop({ type: Number, default: null, min: 0 })
  total!: number | null;

  @Prop({ type: [SchemaFactory.createForClass(BudgetCategory)], default: [] })
  categories!: BudgetCategory[];
}

@Schema({ _id: false, versionKey: false })
export class UploadSettings {
  @Prop({ type: Boolean, required: true, default: false })
  paused!: boolean;

  @Prop({ type: Date, required: true })
  closesAt!: Date;
}

@Schema({ _id: false, versionKey: false })
export class WeddingSettings {
  @Prop({ type: Date, default: null })
  rsvpDeadline!: Date | null;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  replyToEmail!: string;

  @Prop({ type: String, required: true })
  whatsappTemplate!: string;

  @Prop({ type: SchemaFactory.createForClass(UploadSettings), required: true })
  uploads!: UploadSettings;
}

@Schema({ _id: false, versionKey: false })
export class WebsiteContent {
  @Prop({ type: String, required: true })
  heroHeading!: string;

  @Prop({ type: String, required: true })
  heroSubheading!: string;

  @Prop({ type: String, default: null, maxlength: 1000 })
  welcomeMessage!: string | null;

  @Prop({ type: String, required: true })
  rsvpNote!: string;

  @Prop({ type: String, default: null })
  coverImageKey!: string | null;
}

@Schema({ _id: false, versionKey: false })
export class WebsiteSections {
  @Prop({ type: Boolean, default: true })
  welcome!: boolean;

  @Prop({ type: Boolean, default: true })
  gallery!: boolean;

  @Prop({ type: Boolean, default: true })
  live!: boolean;
}

/** The wedding website (WEB). Created unpublished, in the Classic Indian theme (WED-06). */
@Schema({ _id: false, versionKey: false })
export class WeddingWebsite {
  @Prop({ type: String, enum: WEBSITE_THEMES, default: 'classic_indian' })
  theme!: (typeof WEBSITE_THEMES)[number];

  @Prop({ type: Boolean, default: false })
  published!: boolean;

  @Prop({ type: Date, default: null })
  firstPublishedAt!: Date | null;

  @Prop({ type: SchemaFactory.createForClass(WebsiteContent), required: true })
  content!: WebsiteContent;

  @Prop({ type: SchemaFactory.createForClass(WebsiteSections), default: () => ({}) })
  sections!: WebsiteSections;
}

@Schema({ _id: false, versionKey: false })
export class InvitationDesign {
  @Prop({ type: String, enum: INVITATION_DESIGNS, default: 'royal_red' })
  designId!: (typeof INVITATION_DESIGNS)[number];

  @Prop({ type: String, required: true, maxlength: 300 })
  message!: string;
}

/** One wedding: the container for everything (Database Design §9.1). The tenant itself. */
@Schema({ collection: 'weddings', timestamps: true })
export class Wedding {
  @Prop({ type: String, required: true, trim: true, maxlength: 50 })
  brideName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 50 })
  groomName!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  title!: string;

  /** The main wedding day, stored as midnight UTC of that calendar day. */
  @Prop({ type: Date, required: true })
  date!: Date;

  @Prop({ type: String, required: true, trim: true, maxlength: 60 })
  city!: string;

  @Prop({ type: String, default: null, maxlength: 500 })
  description!: string | null;

  @Prop({ type: String, default: null })
  coverImageKey!: string | null;

  /** Website address: makemymarriage.com/w/{slug}. */
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  slug!: string;

  /** Set on first publish; the address can't change after that (WED-08). */
  @Prop({ type: Boolean, required: true, default: false })
  slugLocked!: boolean;

  /** Used by the gallery link and QR code. 10 characters, unique. */
  @Prop({ type: String, required: true })
  galleryCode!: string;

  @Prop({ type: Boolean, required: true, default: false })
  isDemo!: boolean;

  /** Reserved plus ready photos (GAL-09). */
  @Prop({ type: Number, required: true, default: 0 })
  photoCount!: number;

  @Prop({ type: Number, required: true, default: 2000 })
  photoLimit!: number;

  @Prop({ type: [SchemaFactory.createForClass(WeddingGroup)], default: [] })
  groups!: WeddingGroup[];

  @Prop({ type: SchemaFactory.createForClass(WeddingBudget), default: () => ({}) })
  budget!: WeddingBudget;

  @Prop({ type: SchemaFactory.createForClass(WeddingSettings), required: true })
  settings!: WeddingSettings;

  @Prop({ type: SchemaFactory.createForClass(WeddingWebsite), required: true })
  website!: WeddingWebsite;

  @Prop({ type: SchemaFactory.createForClass(InvitationDesign), required: true })
  invitationDesign!: InvitationDesign;

  @Prop({ type: String, enum: SETUP_STEPS, required: true, default: 'details' })
  setupStep!: (typeof SETUP_STEPS)[number];

  @Prop({ type: Date, default: null })
  deletionRequestedAt!: Date | null;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy!: Types.ObjectId;
}

export type WeddingDocument = HydratedDocument<Wedding>;
export const WeddingSchema = SchemaFactory.createForClass(Wedding);

WeddingSchema.index({ slug: 1 }, { unique: true });
WeddingSchema.index({ galleryCode: 1 }, { unique: true });
WeddingSchema.index({ isDemo: 1 }, { partialFilterExpression: { isDemo: true } });
WeddingSchema.index(
  { deletionRequestedAt: 1 },
  { partialFilterExpression: { deletionRequestedAt: { $type: 'date' } } },
);
