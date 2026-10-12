import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from './app.module';
import { runMigrations } from './database/migration-runner';
import { MIGRATIONS } from './database/migrations';

/** `pnpm --filter @mmm/api migrate`: applies pending migrations and syncs indexes, then exits. */
async function migrate(): Promise<void> {
  // The API module registers every model, so syncIndexes covers all collections.
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    await runMigrations(app.get<Connection>(getConnectionToken()), MIGRATIONS, {
      log: (message: string) => console.log(`[migrate] ${message}`),
    });
  } finally {
    await app.close();
  }
}

migrate().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
