import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';

/** Logs worker start and stop. The job queue and scheduler are added with the first job type. */
@Injectable()
export class WorkerLifecycleService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('Worker');

  onApplicationBootstrap(): void {
    this.logger.log('Worker ready (no job handlers registered yet)');
  }

  onApplicationShutdown(signal?: string): void {
    this.logger.log(`Worker stopped${signal ? ` (${signal})` : ''}`);
  }
}
