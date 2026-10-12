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

/** Wraps a payload in the success envelope: `{ "data": … }`. */
export function dataResponse<T extends z.ZodType>(data: T) {
  return z.object({ data });
}
