import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GalleryModule } from '../gallery/gallery.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { WeddingEventRecord, WeddingEventSchema } from './event.schema';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeddingEventRecord.name, schema: WeddingEventSchema }]),
    SessionModule,
    GalleryModule,
    UsersModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
