import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeddingEventRecord, WeddingEventSchema } from './event.schema';
import { EventsService } from './events.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WeddingEventRecord.name, schema: WeddingEventSchema }]),
  ],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
