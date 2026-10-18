import { z } from 'zod';

/** Error codes (API Design §9). */
export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'AUTH_REQUIRED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'DEMO_READ_ONLY',
  'NO_WEDDING',
  'ORIGIN_NOT_ALLOWED',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'LIMIT_REACHED',
  'REFERENCE_INVALID',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  // Area-specific codes (§9.2), added with the feature that introduces them.
  'LOGIN_CODE_INVALID',
  'LOGIN_CODE_EXPIRED',
  'LOGIN_CODE_LOCKED',
  'ALREADY_IN_WEDDING',
  'SLUG_TAKEN',
  'SLUG_LOCKED',
  'JOIN_LINK_INVALID',
  'JOIN_LINK_EXPIRED',
  'JOIN_EMAIL_MISMATCH',
  'LAST_ADMIN',
  'LAST_EVENT',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Shape of every error response. `code` is parsed as a plain string so an
 * older frontend still handles codes it doesn't know yet.
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    field: z.string().nullable(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  requestId: z.string(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
