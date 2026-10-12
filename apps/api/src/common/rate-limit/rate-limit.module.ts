import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RateLimit, RateLimitSchema } from './rate-limit.schema';
import { RateLimitService } from './rate-limit.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: RateLimit.name, schema: RateLimitSchema }])],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
