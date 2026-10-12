import type { Connection } from 'mongoose';
import type { Migration } from './migrations/migration';

const ID_PATTERN = /^\d{4}_[a-z0-9_]+$/;

type MigrationRecord = { _id: string; appliedAt: Date; durationMs: number };

/**
 * Runs pending migrations in order, then creates or updates every model's indexes. Deployment runs
 * this before new code takes traffic; indexes are never built at app start outside development.
 */
export async function runMigrations(
  connection: Connection,
  migrations: readonly Migration[],
  logger?: { log(message: string): void },
): Promise<{ applied: string[] }> {
  assertOrdered(migrations);

  const records = connection.collection<MigrationRecord>('migrations');
  const done = new Set(
    (await records.find({}, { projection: { _id: 1 } }).toArray()).map((r) => r._id),
  );

  const applied: string[] = [];
  for (const migration of migrations) {
    if (done.has(migration.id)) continue;
    const started = Date.now();
    logger?.log(`Applying ${migration.id}`);
    await migration.up(connection);
    await records.insertOne({
      _id: migration.id,
      appliedAt: new Date(),
      durationMs: Date.now() - started,
    });
    applied.push(migration.id);
  }

  await connection.syncIndexes();
  logger?.log(`Indexes in sync; ${applied.length} migration(s) applied`);
  return { applied };
}

function assertOrdered(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (!ID_PATTERN.test(migration.id)) {
      throw new Error(`Migration id "${migration.id}" must look like 0001_snake_case_name`);
    }
    const previous = migrations[index - 1];
    if (previous && previous.id >= migration.id) {
      throw new Error(`Migrations out of order: ${previous.id} must come before ${migration.id}`);
    }
  });
}
