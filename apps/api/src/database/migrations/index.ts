import type { Migration } from './migration';

/** All data migrations, oldest first. Index changes need no migration: `syncIndexes` handles them. */
export const MIGRATIONS: Migration[] = [];
