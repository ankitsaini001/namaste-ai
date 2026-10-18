import { z } from 'zod';
import { LIMITS } from '../limits';
import { SETUP_STEPS } from './auth';
import { idSchema } from './common';

/** The two organiser roles (PRD §7, §28). Admins also manage organisers and settings. */
export const ORGANISER_ROLES = ['admin', 'manager'] as const;
export type OrganiserRole = (typeof ORGANISER_ROLES)[number];

export const ORGANISER_RULES = {
  nameMax: 60,
  /** A join link works for 7 days (ORG-02); resending gives a new link. */
  inviteDays: 7,
  maxOrganisers: LIMITS.organisers,
} as const;

/** "rohit@gmail.com" → "r•••@gmail.com": enough to recognise, not enough to read (ORG-03). */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '•••';
  return `${email[0]}•••${email.slice(at)}`;
}

// POST /v1/organisers/invites (API Design §13.5)
export const inviteOrganiserSchema = z.object({
  name: z
    .string({ error: 'Enter their name.' })
    .trim()
    .min(1, 'Enter their name.')
    .max(
      ORGANISER_RULES.nameMax,
      `Please keep the name under ${ORGANISER_RULES.nameMax + 1} characters.`,
    ),
  email: z
    .string({ error: 'Enter their email address.' })
    .trim()
    .toLowerCase()
    .min(1, 'Enter their email address.')
    .max(254, 'That email address is too long.')
    .pipe(z.email('Enter a valid email address, like rohit@example.com.')),
  role: z.enum(ORGANISER_ROLES, { error: 'Choose Admin or Manager.' }),
});
export type InviteOrganiser = z.infer<typeof inviteOrganiserSchema>;

// PATCH /v1/organisers/:userId (API Design §13.7)
export const changeOrganiserRoleSchema = z.object({
  role: z.enum(ORGANISER_ROLES, { error: 'Choose Admin or Manager.' }),
});
export type ChangeOrganiserRole = z.infer<typeof changeOrganiserRoleSchema>;

// POST /v1/wedding/setup-step (API Design §13.1)
export const setupStepSchema = z.object({
  step: z.enum(SETUP_STEPS, { error: 'Choose a setup step.' }),
});
export type SetupStepInput = z.infer<typeof setupStepSchema>;

// GET /v1/organisers
export const organiserSchema = z.object({
  userId: idSchema,
  name: z.string().nullable(),
  email: z.string(),
  role: z.enum(ORGANISER_ROLES),
  joinedAt: z.string(),
  isYou: z.boolean(),
});
export type Organiser = z.infer<typeof organiserSchema>;

export const organiserInviteSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
  role: z.enum(ORGANISER_ROLES),
  invitedByName: z.string().nullable(),
  sentAt: z.string(),
  expiresAt: z.string(),
  expired: z.boolean(),
});
export type OrganiserInvite = z.infer<typeof organiserInviteSchema>;

export const organisersListSchema = z.object({
  organisers: z.array(organiserSchema),
  /** Invites not yet accepted or cancelled, including expired ones (they can be resent). */
  invites: z.array(organiserInviteSchema),
  limit: z.number().int(),
});
export type OrganisersList = z.infer<typeof organisersListSchema>;

// GET /v1/join/:token (public): what the join page shows (UX brief, Screen 4)
export const joinDetailsSchema = z.object({
  weddingTitle: z.string(),
  inviterName: z.string().nullable(),
  invitedName: z.string(),
  role: z.enum(ORGANISER_ROLES),
  emailHint: z.string(),
  expiresAt: z.string(),
});
export type JoinDetails = z.infer<typeof joinDetailsSchema>;
