import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  type CeremonyInput,
  type CreateEvent,
  endsAtProblem,
  type EventImpact,
  LIMITS,
  mapQuery,
  type UpdateEvent,
  type WeddingEvent,
} from '@mmm/shared';
import { type ClientSession, type Connection, type Model, Types } from 'mongoose';
import { AppException } from '../../common/app.exception';
import { changeStamp } from '../../common/change-stamp';
import { AlbumsService } from '../gallery/albums.service';
import type { WeddingContext } from '../session/auth-context';
import { UsersService } from '../users/users.service';
import { WeddingEventRecord, type WeddingEventDocument } from './event.schema';

export type NewCeremony = CeremonyInput & { id: Types.ObjectId; albumId: Types.ObjectId };

/** A wedding's ceremonies (PRD §9, API Design §14). The screens say "ceremony". */
@Injectable()
export class EventsService {
  constructor(
    @InjectModel(WeddingEventRecord.name) private readonly events: Model<WeddingEventRecord>,
    @InjectConnection() private readonly connection: Connection,
    private readonly albums: AlbumsService,
    private readonly users: UsersService,
  ) {}

  /** Ceremonies are always listed by date and time (EVT-03). */
  listForWedding(weddingId: Types.ObjectId): Promise<WeddingEventDocument[]> {
    return this.events.find({ weddingId }).sort({ startsAt: 1, _id: 1 });
  }

  /** Setup's ceremonies, created with the wedding (WED-05). Their albums are made by the caller. */
  async createMany(
    weddingId: Types.ObjectId,
    ceremonies: readonly NewCeremony[],
    createdBy: Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    if (ceremonies.length === 0) return;
    await this.events.create(
      ceremonies.map((ceremony) => ({
        _id: ceremony.id,
        weddingId,
        type: ceremony.type,
        name: ceremony.name,
        startsAt: new Date(ceremony.startsAt),
        showOnWebsite: ceremony.showOnWebsite,
        albumId: ceremony.albumId,
        createdBy,
      })),
      { session, ordered: true },
    );
  }

  /** EVT-01, EVT-05, EVT-08: a new ceremony and its album, together. */
  async create(auth: WeddingContext, input: CreateEvent): Promise<WeddingEventDocument> {
    if ((await this.events.countDocuments({ weddingId: auth.weddingId })) >= LIMITS.events) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'LIMIT_REACHED',
        `A wedding can have up to ${LIMITS.events} ceremonies.`,
        null,
        { limit: LIMITS.events, resource: 'events' },
      );
    }
    const eventId = new Types.ObjectId();
    const albumId = new Types.ObjectId();
    return this.connection.transaction(async (session) => {
      const [event] = await this.events.create(
        [
          {
            _id: eventId,
            weddingId: auth.weddingId,
            type: input.type,
            name: input.name,
            startsAt: new Date(input.startsAt),
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
            venueName: input.venueName,
            address: input.address,
            mapUrl: input.mapUrl,
            mapEmbedQuery: mapQuery(input.venueName, input.address),
            description: input.description,
            dressCode: input.dressCode,
            showOnWebsite: input.showOnWebsite,
            livestreamUrl: input.livestreamUrl,
            albumId,
            createdBy: auth.userId,
          },
        ],
        { session },
      );
      await this.albums.createForEvent(
        auth.weddingId,
        { eventId, albumId, name: input.name },
        session,
      );
      return event!;
    });
  }

  async get(auth: WeddingContext, eventId: string): Promise<WeddingEventDocument> {
    const event = await this.events.findOne({ _id: eventId, weddingId: auth.weddingId });
    if (!event) throw eventNotFound();
    return event;
  }

  /** EVT-01, EVT-07: changes only what's sent; the album follows the name. */
  async update(
    auth: WeddingContext,
    eventId: string,
    changes: UpdateEvent,
    now = new Date(),
  ): Promise<WeddingEventDocument> {
    const event = await this.get(auth, eventId);
    const startsAt = changes.startsAt ?? event.startsAt.toISOString();
    const endsAt = changes.endsAt !== undefined ? changes.endsAt : event.endsAt?.toISOString();
    const problem = endsAtProblem(startsAt, endsAt);
    if (problem) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', problem, 'endsAt');
    }

    const renamed = changes.name !== undefined && changes.name !== event.name;
    if (changes.name !== undefined) event.name = changes.name;
    if (changes.startsAt !== undefined) event.startsAt = new Date(changes.startsAt);
    if (changes.endsAt !== undefined)
      event.endsAt = changes.endsAt ? new Date(changes.endsAt) : null;
    if (changes.venueName !== undefined) event.venueName = changes.venueName;
    if (changes.address !== undefined) event.address = changes.address;
    if (changes.mapUrl !== undefined) event.mapUrl = changes.mapUrl;
    if (changes.description !== undefined) event.description = changes.description;
    if (changes.dressCode !== undefined) event.dressCode = changes.dressCode;
    if (changes.showOnWebsite !== undefined) event.showOnWebsite = changes.showOnWebsite;
    if (changes.livestreamUrl !== undefined) event.livestreamUrl = changes.livestreamUrl;
    event.mapEmbedQuery = mapQuery(event.venueName, event.address);
    event.changedBy = auth.userId;
    event.changedAt = now;

    await this.connection.transaction(async (session) => {
      await event.save({ session });
      if (renamed) await this.albums.renameForEvent(auth.weddingId, event._id, event.name, session);
    });
    return event;
  }

  /** What deleting would do, for the confirmation (EVT-06). Features not built yet add 0. */
  async impact(auth: WeddingContext, eventId: string): Promise<EventImpact> {
    const event = await this.get(auth, eventId);
    return {
      invitationsRemoved: 0,
      tasksUnlinked: 0,
      shoppingUnlinked: 0,
      expensesUnlinked: 0,
      vendorsUnlinked: 0,
      photosMovedToGeneral: await this.albums.photoCountForEvent(auth.weddingId, event._id),
    };
  }

  /**
   * EVT-06: deletes the ceremony and its album, keeping at least one ceremony (owner's decision,
   * 18 Oct 2026). Every ceremony is touched in the transaction, so deleting the last two at the
   * same moment conflicts and the retried one is refused, instead of both succeeding.
   */
  async remove(auth: WeddingContext, eventId: string): Promise<EventImpact> {
    const impact = await this.impact(auth, eventId);
    const id = new Types.ObjectId(eventId);
    await this.connection.transaction(async (session) => {
      await this.events.updateMany(
        { weddingId: auth.weddingId },
        { $currentDate: { updatedAt: true } },
        { session },
      );
      const result = await this.events.deleteOne(
        { _id: id, weddingId: auth.weddingId },
        { session },
      );
      if (result.deletedCount === 0) throw eventNotFound();
      if ((await this.events.countDocuments({ weddingId: auth.weddingId }, { session })) === 0) {
        throw new AppException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'LAST_EVENT',
          'A wedding needs at least one ceremony. Add another ceremony first.',
        );
      }
      await this.albums.deleteForEvent(auth.weddingId, id, session);
    });
    return impact;
  }

  /** The Event shape the API returns (API Design §8.4), with who added and last changed it. */
  async toDtos(events: readonly WeddingEventDocument[]): Promise<WeddingEvent[]> {
    const names = await this.users.namesFor(events.flatMap((e) => [e.createdBy, e.changedBy]));
    return events.map((event) => ({
      id: String(event._id),
      type: event.type,
      name: event.name,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt?.toISOString() ?? null,
      venueName: event.venueName,
      address: event.address,
      mapUrl: event.mapUrl,
      mapEmbedQuery: event.mapEmbedQuery,
      description: event.description,
      dressCode: event.dressCode,
      // Cover images arrive with file uploads.
      coverImageUrl: null,
      showOnWebsite: event.showOnWebsite,
      livestreamUrl: event.livestreamUrl,
      albumId: String(event.albumId),
      added: changeStamp(names, event.createdBy, event.createdAt),
      lastChanged: changeStamp(names, event.changedBy, event.changedAt),
    }));
  }

  async toDto(event: WeddingEventDocument): Promise<WeddingEvent> {
    return (await this.toDtos([event]))[0]!;
  }
}

function eventNotFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', "We couldn't find that ceremony.");
}
