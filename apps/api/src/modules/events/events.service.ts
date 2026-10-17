import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { CeremonyInput, WeddingEvent } from '@mmm/shared';
import type { ClientSession, Model, Types } from 'mongoose';
import { WeddingEventRecord, type WeddingEventDocument } from './event.schema';

export type NewCeremony = CeremonyInput & { id: Types.ObjectId; albumId: Types.ObjectId };

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(WeddingEventRecord.name) private readonly events: Model<WeddingEventRecord>,
  ) {}

  /** Ceremonies are always listed by date and time (EVT-03). */
  listForWedding(weddingId: Types.ObjectId): Promise<WeddingEventDocument[]> {
    return this.events.find({ weddingId }).sort({ startsAt: 1, _id: 1 });
  }

  async createMany(
    weddingId: Types.ObjectId,
    ceremonies: readonly NewCeremony[],
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
      })),
      { session, ordered: true },
    );
  }

  /** The Event shape the API returns (API Design §8.4). */
  toDto(event: WeddingEventDocument): WeddingEvent {
    return {
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
    };
  }
}
