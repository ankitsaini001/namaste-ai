import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

/** Starts the background worker (System Design §12). Runs as its own process, without HTTP. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  // SIGTERM/SIGINT close the app, which closes the MongoDB connection and lets the process exit.
  app.enableShutdownHooks();
}

void bootstrap();
