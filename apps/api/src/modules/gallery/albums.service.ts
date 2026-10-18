import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { Album } from './album.schema';

@Injectable()
export class AlbumsService {
  constructor(@InjectModel(Album.name) private readonly albums: Model<Album>) {}

  /** EVT-05: every ceremony has its own album. */
  async createForEvent(
    weddingId: Types.ObjectId,
    album: { eventId: Types.ObjectId; albumId: Types.ObjectId; name: string },
    session: ClientSession,
  ): Promise<void> {
    await this.albums.create(
      [{ _id: album.albumId, weddingId, eventId: album.eventId, name: album.name }],
      { session },
    );
  }

  /** A ceremony's album always has the ceremony's name (owner's decision, 18 Oct 2026). */
  async renameForEvent(
    weddingId: Types.ObjectId,
    eventId: Types.ObjectId,
    name: string,
    session: ClientSession,
  ): Promise<void> {
    await this.albums.updateOne({ weddingId, eventId }, { $set: { name } }, { session });
  }

  /** How many photos would move to "General" if the ceremony were deleted (EVT-06). */
  async photoCountForEvent(weddingId: Types.ObjectId, eventId: Types.ObjectId): Promise<number> {
    const album = await this.albums.findOne({ weddingId, eventId }, { photoCount: 1 });
    return album?.photoCount ?? 0;
  }

  /** Deletes a ceremony's album. Moving its photos to "General" comes with the gallery (GAL). */
  async deleteForEvent(
    weddingId: Types.ObjectId,
    eventId: Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    await this.albums.deleteOne({ weddingId, eventId }, { session });
  }

  /** The "General" album plus one per ceremony (WED-06, GAL-02). */
  async createForNewWedding(
    weddingId: Types.ObjectId,
    ceremonies: readonly { eventId: Types.ObjectId; albumId: Types.ObjectId; name: string }[],
    session: ClientSession,
  ): Promise<void> {
    await this.albums.create(
      [
        { weddingId, eventId: null, name: 'General' },
        ...ceremonies.map((c) => ({ _id: c.albumId, weddingId, eventId: c.eventId, name: c.name })),
      ],
      { session, ordered: true },
    );
  }
}
