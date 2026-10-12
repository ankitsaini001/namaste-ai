import type { Connection } from 'mongoose';

/**
 * A numbered, one-off database change (Database Design §18.5). Each runs once, is recorded in the
 * `migrations` collection, and must be safe to run again if it was interrupted.
 */
export interface Migration {
  /** `NNNN_snake_case_name`, for example `0001_backfill_name_lower`. */
  id: string;
  up(connection: Connection): Promise<void>;
}
