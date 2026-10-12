import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateWorkerEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { JobRunnerModule } from './jobs/jobs.module';
import { EmailDeliveryModule } from './modules/notifications/delivery/email-delivery.module';

/** Root module for the worker process: no HTTP controllers. Job handlers are added per feature. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateWorkerEnv }),
    DatabaseModule,
    JobRunnerModule,
    EmailDeliveryModule,
  ],
})
export class WorkerModule {}
