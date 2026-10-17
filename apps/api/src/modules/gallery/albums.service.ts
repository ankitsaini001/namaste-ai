import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ClientSession, Model, Types } from 'mongoose';
import { Album } from './album.schema';

@Injectable()
export class AlbumsService {
  constructor(@InjectModel(Album.name) private readonly albums: Model<Album>) {}

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
