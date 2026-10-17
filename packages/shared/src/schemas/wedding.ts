import { z } from 'zod';
import { addYears, todayInIst } from '../ist';
import { LIMITS } from '../limits';
import { SETUP_STEPS } from './auth';
import { idSchema } from './common';

export const EVENT_TYPES = [
  'engagement',
  'roka',
  'mehendi',
  'haldi',
  'sangeet',
  'cocktail',
  'wedding',
  'reception',
  'custom',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Ceremony presets offered in setup (WED-05), with a typical start time in IST. */
export const CEREMONY_PRESETS: readonly {
  type: Exclude<EventType, 'custom'>;
  name: string;
  time: string;
}[] = [
  { type: 'engagement', name: 'Engagement', time: '18:00' },
  { type: 'roka', name: 'Roka', time: '11:00' },
  { type: 'mehendi', name: 'Mehendi', time: '16:00' },
  { type: 'haldi', name: 'Haldi', time: '10:00' },
  { type: 'sangeet', name: 'Sangeet', time: '19:00' },
  { type: 'cocktail', name: 'Cocktail', time: '20:00' },
  { type: 'wedding', name: 'Wedding', time: '19:00' },
  { type: 'reception', name: 'Reception', time: '20:00' },
];

/** Validation limits from the PRD (§6, WED validation) and Database Design (§9). */
export const WEDDING_RULES = {
  coupleName: { min: 1, max: 50 },
  title: { min: 1, max: 80 },
  city: { min: 2, max: 60 },
  descriptionMax: 500,
  slug: { min: 3, max: 40 },
  maxYearsAhead: 3,
  eventNameMax: 40,
} as const;

/** Website addresses that would clash with the app's own pages or look official. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'about',
  'account',
  'admin',
  'api',
  'app',
  'assets',
  'card',
  'contact',
  'dashboard',
  'demo',
  'edit',
  'gallery',
  'help',
  'invite',
  'join',
  'login',
  'logout',
  'mail',
  'makemymarriage',
  'media',
  'mmm',
  'new',
  'null',
  'privacy',
  'setup',
  'settings',
  'signin',
  'signup',
  'static',
  'status',
  'support',
  'terms',
  'undefined',
  'w',
  'www',
]);

const SLUG_PATTERN = /^[a-z0-9-]{3,40}$/;

/** The website address check, in the order the person should hear about problems. */
export function slugProblem(slug: string): 'invalid' | 'reserved' | null {
  if (!SLUG_PATTERN.test(slug)) return 'invalid';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';
  return null;
}

export const SLUG_MESSAGES = {
  invalid: 'Use 3–40 lowercase letters, numbers and hyphens.',
  reserved: 'That address is reserved. Please choose another.',
  taken: 'That address is already taken. Please choose another.',
} as const;

export const slugSchema = z
  .string({ error: 'Choose a website address.' })
  .trim()
  .toLowerCase()
  .superRefine((slug, ctx) => {
    if (!slug) {
      ctx.addIssue({ code: 'custom', message: 'Choose a website address.' });
      return;
    }
    const problem = slugProblem(slug);
    if (problem) ctx.addIssue({ code: 'custom', message: SLUG_MESSAGES[problem] });
  });

/** "Princi" + "Akshay" → "princi-akshay": accents and symbols removed, at most 40 characters. */
export function suggestSlug(brideName: string, groomName: string): string {
  const clean = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  let slug = [clean(brideName), clean(groomName)].filter(Boolean).join('-').slice(0, 40);
  slug = slug.replace(/-+$/g, '');
  if (slug.length < 3) slug = `${slug ? `${slug}-` : ''}wedding`;
  return RESERVED_SLUGS.has(slug) ? `${slug}-wedding` : slug;
}

/** The title the setup form fills in (WED-03): bride first, joined with "&". */
export function defaultWeddingTitle(brideName: string, groomName: string): string {
  return [brideName.trim(), groomName.trim()].filter(Boolean).join(' & ');
}

const text = (label: string, { min, max }: { min: number; max: number }) =>
  z
    .string({ error: `Enter the ${label}.` })
    .trim()
    // Empty fields ask for the value; too-short ones say how long it needs to be.
    .min(1, `Enter the ${label}.`)
    .min(min, `The ${label} needs at least ${min} characters.`)
    .max(max, `Please keep the ${label} under ${max + 1} characters.`);

/** A ceremony as entered during setup (WED-05). Fuller details come with the Ceremonies feature. */
export const ceremonyInputSchema = z.object({
  type: z.enum(EVENT_TYPES),
  name: text('ceremony name', { min: 1, max: WEDDING_RULES.eventNameMax }),
  startsAt: z.iso.datetime({ error: 'Choose a date and time.' }),
  showOnWebsite: z.boolean().default(true),
});
export type CeremonyInput = z.infer<typeof ceremonyInputSchema>;

/** POST /v1/wedding (API Design §13.2). `date` is a calendar day; validated against IST today. */
export const createWeddingSchema = z.object({
  brideName: text("bride's name", WEDDING_RULES.coupleName),
  groomName: text("groom's name", WEDDING_RULES.coupleName),
  title: text('wedding title', WEDDING_RULES.title),
  date: z
    .string({ error: 'Choose the wedding date.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the wedding date.')
    .refine((day) => !Number.isNaN(Date.parse(day)), 'Choose the wedding date.')
    .refine((day) => day >= todayInIst(), 'The wedding date must be today or later.')
    .refine(
      (day) => day <= addYears(todayInIst(), WEDDING_RULES.maxYearsAhead),
      `The wedding date must be within ${WEDDING_RULES.maxYearsAhead} years.`,
    ),
  city: text('city', WEDDING_RULES.city),
  description: z
    .string()
    .trim()
    .max(
      WEDDING_RULES.descriptionMax,
      `Please keep the description under ${WEDDING_RULES.descriptionMax + 1} characters.`,
    )
    .nullish()
    .transform((value) => (value ? value : null)),
  slug: slugSchema,
  events: z
    .array(ceremonyInputSchema)
    .min(1, 'Add at least one ceremony.')
    .max(LIMITS.events, `A wedding can have up to ${LIMITS.events} ceremonies.`),
});
export type CreateWedding = z.infer<typeof createWeddingSchema>;
export type CreateWeddingInput = z.input<typeof createWeddingSchema>;

// Shared data shapes (API Design §8.3, §8.4)
export const weddingSchema = z.object({
  id: idSchema,
  brideName: z.string(),
  groomName: z.string(),
  title: z.string(),
  date: z.string(),
  city: z.string(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  slug: z.string(),
  slugLocked: z.boolean(),
  galleryCode: z.string(),
  photoCount: z.number().int(),
  photoLimit: z.number().int(),
  groups: z.array(z.object({ id: idSchema, name: z.string() })),
  setupStep: z.enum(SETUP_STEPS),
  isDemo: z.boolean(),
});
export type Wedding = z.infer<typeof weddingSchema>;

export const eventSchema = z.object({
  id: idSchema,
  type: z.enum(EVENT_TYPES),
  name: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  venueName: z.string().nullable(),
  address: z.string().nullable(),
  mapUrl: z.string().nullable(),
  mapEmbedQuery: z.string().nullable(),
  description: z.string().nullable(),
  dressCode: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  showOnWebsite: z.boolean(),
  livestreamUrl: z.string().nullable(),
  albumId: idSchema,
});
export type WeddingEvent = z.infer<typeof eventSchema>;

// GET /v1/wedding/slug-available?slug=
export const slugAvailabilitySchema = z.object({
  available: z.boolean(),
  reason: z.enum(['invalid', 'reserved', 'taken']).nullable(),
});
export type SlugAvailability = z.infer<typeof slugAvailabilitySchema>;
