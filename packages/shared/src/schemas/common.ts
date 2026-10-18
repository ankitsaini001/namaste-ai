import { z } from 'zod';

/** Lowercase, trimmed, valid, at most 254 characters (Database Design §6.4). */
export const emailSchema = z
  .string({ error: 'Enter your email address.' })
  .trim()
  .toLowerCase()
  .min(1, 'Enter your email address.')
  .max(254, 'That email address is too long.')
  .pipe(z.email('Enter a valid email address, like you@example.com.'));

/** 24-character hex MongoDB ObjectId, as sent by the API. */
export const idSchema = z.string().regex(/^[0-9a-f]{24}$/);

/**
 * Who did something and when, shown as "Added by …" or "Last changed by …" in the section it
 * belongs to. `by` is the person's name, or null if they're no longer known.
 */
export const changeStampSchema = z.object({ by: z.string().nullable(), at: z.string() });
export type ChangeStamp = z.infer<typeof changeStampSchema>;

/** Wraps a payload in the success envelope: `{ "data": … }`. */
export function dataResponse<T extends z.ZodType>(data: T) {
  return z.object({ data });
}
