import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module';
import { GalleryModule } from '../gallery/gallery.module';
import { MembersModule } from '../members/members.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { Wedding, WeddingSchema } from './wedding.schema';
import { WeddingsController } from './weddings.controller';
import { WeddingsService } from './weddings.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Wedding.name, schema: WeddingSchema }]),
    SessionModule,
    MembersModule,
    EventsModule,
    GalleryModule,
    UsersModule,
  ],
  controllers: [WeddingsController],
  providers: [WeddingsService],
  exports: [WeddingsService],
})
export class WeddingsModule {}
