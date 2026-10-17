import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  calendarDayToDate,
  type CreateWedding,
  type Me,
  type SlugAvailability,
  slugProblem,
  SLUG_MESSAGES,
  type Wedding as WeddingDto,
} from '@mmm/shared';
import { type Connection, type Model, Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import { generateCode } from '../../common/codes';
import { EventsService } from '../events/events.service';
import { AlbumsService } from '../gallery/albums.service';
import { MembersService } from '../members/members.service';
import { PRESET_GROUPS, Wedding, type WeddingDocument } from './wedding.schema';

const DUPLICATE_KEY = 11000;
const UPLOADS_OPEN_DAYS = 30;

type DuplicateKeyError = { code?: number; keyPattern?: Record<string, unknown> };

@Injectable()
export class WeddingsService {
  constructor(
    @InjectModel(Wedding.name) private readonly weddings: Model<Wedding>,
    @InjectConnection() private readonly connection: Connection,
    private readonly members: MembersService,
    private readonly events: EventsService,
    private readonly albums: AlbumsService,
  ) {}

  /**
   * Creates the wedding, the creator's Admin membership, the ceremonies and their albums in one
   * transaction (WED-02, WED-06; Database Design §16.3), so either all of it exists or none does.
   */
  async create(
    creator: { id: Types.ObjectId; email: string },
    input: CreateWedding,
    now = new Date(),
  ): Promise<WeddingDocument> {
    if (await this.members.findByUser(creator.id)) throw alreadyInWedding();
    if (await this.weddings.exists({ slug: input.slug })) throw slugTaken();

    // A gallery-code collision (about 1 in 10¹⁴) just means trying again with a new code.
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.createOnce(creator, input, now);
      } catch (error) {
        const { code, keyPattern } = error as DuplicateKeyError;
        if (code !== DUPLICATE_KEY) throw error;
        if (keyPattern?.slug) throw slugTaken();
        if (keyPattern?.userId) throw alreadyInWedding();
        if (!keyPattern?.galleryCode || attempt >= 3) throw error;
      }
    }
  }

  private createOnce(
    creator: { id: Types.ObjectId; email: string },
    input: CreateWedding,
    now: Date,
  ): Promise<WeddingDocument> {
    const weddingId = new Types.ObjectId();
    const ceremonies = input.events.map((event) => ({
      ...event,
      id: new Types.ObjectId(),
      albumId: new Types.ObjectId(),
    }));
    const date = calendarDayToDate(input.date);

    return this.connection.transaction(async (session) => {
      const [wedding] = await this.weddings.create(
        [
          {
            _id: weddingId,
            brideName: input.brideName,
            groomName: input.groomName,
            title: input.title,
            date,
            city: input.city,
            description: input.description,
            slug: input.slug,
            galleryCode: generateCode(),
            groups: PRESET_GROUPS.map((name) => ({ _id: new Types.ObjectId(), name })),
            settings: {
              replyToEmail: creator.email,
              whatsappTemplate:
                'Namaste {guest_name}, {couple} would love you to join their wedding celebrations. Your invitation: {link}',
              // Guest uploads close 30 days after the main date (UPL-08).
              uploads: {
                paused: false,
                closesAt: new Date(date.getTime() + UPLOADS_OPEN_DAYS * 24 * 60 * 60_000),
              },
            },
            website: {
              content: {
                heroHeading: `${input.brideName} & ${input.groomName}`,
                heroSubheading: "We're getting married",
                rsvpNote: 'Please let us know for each ceremony whether you can join us.',
              },
            },
            invitationDesign: {
              message: 'Together with our families, we invite you to celebrate with us.',
            },
            // Setup has two steps for now; "Invite your family" becomes a third with ORG.
            setupStep: 'done',
            createdBy: creator.id,
          },
        ],
        { session },
      );
      await this.members.add(weddingId, creator.id, 'admin', session, now);
      await this.albums.createForNewWedding(
        weddingId,
        ceremonies.map((c) => ({ eventId: c.id, albumId: c.albumId, name: c.name })),
        session,
      );
      await this.events.createMany(weddingId, ceremonies, session);
      return wedding!;
    });
  }

  findById(weddingId: Types.ObjectId): Promise<WeddingDocument | null> {
    return this.weddings.findById(weddingId);
  }

  /** WED-04: is this website address free? Never throws for a bad address; it says why instead. */
  async slugAvailability(slug: string): Promise<SlugAvailability> {
    const normalised = slug.trim().toLowerCase();
    const problem = slugProblem(normalised);
    if (problem) return { available: false, reason: problem };
    const taken = await this.weddings.exists({ slug: normalised });
    return taken ? { available: false, reason: 'taken' } : { available: true, reason: null };
  }

  /** The wedding part of Me (API Design §8.2). */
  toSummary(wedding: WeddingDocument): NonNullable<Me['wedding']> {
    return {
      id: String(wedding._id),
      title: wedding.title,
      date: wedding.date.toISOString(),
      setupStep: wedding.setupStep,
      isDemo: wedding.isDemo,
    };
  }

  /** The Wedding shape the API returns (API Design §8.3, the parts built so far). */
  toDto(wedding: WeddingDocument): WeddingDto {
    return {
      id: String(wedding._id),
      brideName: wedding.brideName,
      groomName: wedding.groomName,
      title: wedding.title,
      date: wedding.date.toISOString(),
      city: wedding.city,
      description: wedding.description,
      // Cover images arrive with file uploads.
      coverImageUrl: null,
      slug: wedding.slug,
      slugLocked: wedding.slugLocked,
      galleryCode: wedding.galleryCode,
      photoCount: wedding.photoCount,
      photoLimit: wedding.photoLimit,
      groups: wedding.groups.map((g) => ({ id: String(g._id), name: g.name })),
      setupStep: wedding.setupStep,
      isDemo: wedding.isDemo,
    };
  }
}

function alreadyInWedding(): AppException {
  return new AppException(
    HttpStatus.CONFLICT,
    'ALREADY_IN_WEDDING',
    'You already have a wedding. Each account can plan one wedding.',
  );
}

function slugTaken(): AppException {
  return new AppException(HttpStatus.CONFLICT, 'SLUG_TAKEN', SLUG_MESSAGES.taken, 'slug');
}
