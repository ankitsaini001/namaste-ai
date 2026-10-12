import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateApiEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateApiEnv }),
    DatabaseModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}
