import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import type { BaseEnv } from '../config/env';
import { DatabaseHealthIndicator } from './database-health.indicator';

/** The MongoDB connection, shared by the API and the worker. Schemas arrive with features. */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<BaseEnv, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        // Indexes are created by a migration step, never at startup outside local development.
        autoIndex: config.get('NODE_ENV', { infer: true }) === 'development',
        serverSelectionTimeoutMS: 5000,
        retryAttempts: 3,
        retryDelay: 2000,
      }),
    }),
  ],
  providers: [DatabaseHealthIndicator],
  exports: [DatabaseHealthIndicator],
})
export class DatabaseModule {}
