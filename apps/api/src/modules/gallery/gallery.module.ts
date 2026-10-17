import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Album, AlbumSchema } from './album.schema';
import { AlbumsService } from './albums.service';

/** Photo albums now; photos, uploads and the shared gallery come with GAL and UPL. */
@Module({
  imports: [MongooseModule.forFeature([{ name: Album.name, schema: AlbumSchema }])],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class GalleryModule {}
