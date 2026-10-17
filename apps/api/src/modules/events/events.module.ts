import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SessionModule } from '../session/session.module';
import { WeddingEventRecord, WeddingEventSchema } from './event.schema';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeddingEventRecord.name, schema: WeddingEventSchema }]),
    SessionModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
