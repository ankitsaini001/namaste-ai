import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { JobQueue } from './job-queue.service';
import { JobRunner } from './job-runner.service';
import { Job, JobSchema } from './job.schema';

const jobModel = MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]);

/** Enqueueing jobs: imported by API feature modules. */
@Module({
  imports: [jobModel],
  providers: [JobQueue],
  exports: [JobQueue],
})
export class JobsModule {}

/** Running jobs: imported only by the worker. */
@Module({
  imports: [jobModel, DiscoveryModule],
  providers: [JobRunner],
  exports: [JobRunner],
})
export class JobRunnerModule {}
