import type { ChangeStamp } from '@mmm/shared';
import type { Types } from 'mongoose';

/**
 * Who did something and when, for "Added by …" and "Last changed by …" lines (owner's decision,
 * 18 Oct 2026). Records keep the user ID; the name is looked up when the record is shown.
 */
export function changeStamp(
  names: ReadonlyMap<string, string | null>,
  by: Types.ObjectId | null | undefined,
  at: Date | null | undefined,
): ChangeStamp | null {
  if (!at) return null;
  return { by: by ? (names.get(String(by)) ?? null) : null, at: at.toISOString() };
}
