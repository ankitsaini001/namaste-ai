import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateApiEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';
import { WeddingsModule } from './modules/weddings/weddings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateApiEnv }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    WeddingsModule,
    EventsModule,
  ],
})
export class AppModule {}
