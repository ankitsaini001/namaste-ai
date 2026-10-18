import { z } from 'zod';
import { emailSchema, idSchema } from './common';

/** Login rules from the PRD (AUTH-02 to AUTH-06). */
export const AUTH_RULES = {
  codeLength: 6,
  codeTtlSeconds: 10 * 60,
  maxWrongAttempts: 5,
  codesPerEmail: { max: 3, windowSeconds: 15 * 60 },
  sessionDays: 30,
  /** How long the code screen waits before offering "Resend code". */
  resendAfterSeconds: 45,
} as const;

export const SESSION_COOKIE = 'mmm_session';

// POST /v1/auth/email-code
export const emailCodeRequestSchema = z.object({ email: emailSchema });
export type EmailCodeRequest = z.infer<typeof emailCodeRequestSchema>;

export const emailCodeSentSchema = z.object({
  sent: z.literal(true),
  expiresInSeconds: z.number().int().positive(),
});
export type EmailCodeSent = z.infer<typeof emailCodeSentSchema>;

// POST /v1/auth/email-code/verify
export const emailCodeVerifySchema = z.object({
  email: emailSchema,
  code: z
    .string({ error: 'Enter the 6-digit code from your email.' })
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your email.'),
  // Organiser invitations (ORG) pass a join token; accepted now, used later.
  joinToken: z.string().max(200).nullable().optional(),
});
export type EmailCodeVerify = z.infer<typeof emailCodeVerifySchema>;

// Shared data shapes (API Design §8.1, §8.2)
export const userSchema = z.object({
  id: idSchema,
  // Null until a user who signed in with an email code tells us their name (AUTH-05).
  name: z.string().nullable(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  hasGoogle: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

export const ROLES = ['admin', 'manager', 'demo'] as const;
export const SETUP_STEPS = ['details', 'events', 'organisers', 'done'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

export const meSchema = z.object({
  user: userSchema,
  needsName: z.boolean(),
  wedding: z
    .object({
      id: idSchema,
      title: z.string(),
      date: z.string(),
      setupStep: z.enum(SETUP_STEPS),
      isDemo: z.boolean(),
    })
    .nullable(),
  role: z.enum(ROLES).nullable(),
});
export type Me = z.infer<typeof meSchema>;

// PATCH /v1/me
export const updateMeSchema = z.object({
  name: z
    .string({ error: 'Enter your name.' })
    .trim()
    .min(1, 'Enter your name.')
    .max(60, 'Please keep your name under 60 characters.'),
});
export type UpdateMe = z.infer<typeof updateMeSchema>;
