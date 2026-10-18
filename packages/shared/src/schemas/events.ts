import { z } from 'zod';
import { addDays } from '../ist';
import { EVENT_TYPES, type EventType, eventSchema, WEDDING_RULES } from './wedding';

/** Ceremony field limits (Database Design §9.2). */
export const EVENT_RULES = {
  venueMax: 80,
  addressMax: 200,
  descriptionMax: 500,
  dressCodeMax: 80,
} as const;

/**
 * The day a preset ceremony starts on when added (owner's decision, 18 Oct 2026): the usual
 * pre-wedding ceremonies the day before, the reception the day after, and no guess for an
 * engagement or roka, which can be months earlier.
 */
export function presetDefaultDay(type: EventType, weddingDay: string): string | null {
  if (!weddingDay) return null;
  switch (type) {
    case 'mehendi':
    case 'haldi':
    case 'sangeet':
    case 'cocktail':
      return addDays(weddingDay, -1);
    case 'reception':
      return addDays(weddingDay, 1);
    case 'engagement':
    case 'roka':
      return null;
    default:
      return weddingDay;
  }
}

/** The text Google uses to place the venue on a map, from the venue's name and address. */
export function mapQuery(venueName: string | null, address: string | null): string | null {
  return [venueName, address].filter((part) => part?.trim()).join(', ') || null;
}

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep the ${label} under ${max + 1} characters.`)
    .nullish()
    .transform((value) => (value ? value : null));

/** Blank means "none"; anything else must be a whole web address. */
const optionalUrl = (message: string, allowedHosts?: readonly string[]) =>
  z
    .string()
    .trim()
    .max(2000, message)
    .nullish()
    .transform((value) => (value ? value : null))
    .refine((value) => {
      if (value === null) return true;
      try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
        return !allowedHosts || allowedHosts.includes(url.hostname.replace(/^www\.|^m\./, ''));
      } catch {
        return false;
      }
    }, message);

const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be'] as const;

/** "Ends before it starts" — the screen turns an earlier end time into the next morning. */
export function endsAtProblem(startsAt: string, endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  return Date.parse(endsAt) > Date.parse(startsAt) ? null : 'The end time must be after the start.';
}

const eventFields = {
  name: z
    .string({ error: 'Enter the ceremony name.' })
    .trim()
    .min(1, 'Enter the ceremony name.')
    .max(
      WEDDING_RULES.eventNameMax,
      `Please keep the ceremony name under ${WEDDING_RULES.eventNameMax + 1} characters.`,
    ),
  startsAt: z.iso.datetime({ error: 'Choose a date and start time.' }),
  endsAt: z.iso
    .datetime({ error: 'Choose an end time.' })
    .nullish()
    .transform((v) => v ?? null),
  venueName: optionalText('venue name', EVENT_RULES.venueMax),
  address: optionalText('address', EVENT_RULES.addressMax),
  mapUrl: optionalUrl('Paste the whole link from Google Maps, starting with https://.'),
  description: optionalText('description', EVENT_RULES.descriptionMax),
  dressCode: optionalText('dress code', EVENT_RULES.dressCodeMax),
  showOnWebsite: z.boolean({ error: 'Choose whether it shows on the website.' }),
  livestreamUrl: optionalUrl('Paste a YouTube link, from youtube.com or youtu.be.', YOUTUBE_HOSTS),
};

// POST /v1/events (API Design §14). The map location is worked out from the venue and address.
export const createEventSchema = z
  .object({
    type: z.enum(EVENT_TYPES, { error: 'Choose a ceremony type.' }),
    ...eventFields,
    showOnWebsite: eventFields.showOnWebsite.default(true),
  })
  .superRefine((event, ctx) => {
    const problem = endsAtProblem(event.startsAt, event.endsAt);
    if (problem) ctx.addIssue({ code: 'custom', message: problem, path: ['endsAt'] });
  });
export type CreateEvent = z.infer<typeof createEventSchema>;
export type CreateEventInput = z.input<typeof createEventSchema>;

// PATCH /v1/events/:id: any of the fields, except the type, which stays as created.
export const updateEventSchema = z
  .object(eventFields)
  .partial()
  .refine((changes) => Object.keys(changes).length > 0, 'Change at least one detail.');
export type UpdateEvent = z.infer<typeof updateEventSchema>;
export type UpdateEventInput = z.input<typeof updateEventSchema>;

/** What deleting a ceremony does (EVT-06); counts for features not built yet stay 0. */
export const eventImpactSchema = z.object({
  invitationsRemoved: z.number().int(),
  tasksUnlinked: z.number().int(),
  shoppingUnlinked: z.number().int(),
  expensesUnlinked: z.number().int(),
  vendorsUnlinked: z.number().int(),
  photosMovedToGeneral: z.number().int(),
});
export type EventImpact = z.infer<typeof eventImpactSchema>;

// GET /v1/events/:id?include=impact, and the reply to DELETE /v1/events/:id
export const eventDetailSchema = eventSchema.extend({ impact: eventImpactSchema.optional() });
export type EventDetail = z.infer<typeof eventDetailSchema>;
export const eventDeletedSchema = eventImpactSchema.extend({ deleted: z.literal(true) });
export type EventDeleted = z.infer<typeof eventDeletedSchema>;
