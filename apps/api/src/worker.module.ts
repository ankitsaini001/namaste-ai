import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateWorkerEnv } from './config/env';
import { DatabaseModule } from './database/database.module';
import { WorkerLifecycleService } from './worker/worker-lifecycle.service';

/** Root module for the worker process: no HTTP controllers. */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateWorkerEnv }),
    DatabaseModule,
  ],
  providers: [WorkerLifecycleService],
})
export class WorkerModule {}
