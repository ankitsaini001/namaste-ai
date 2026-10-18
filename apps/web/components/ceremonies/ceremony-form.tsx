'use client';

import {
  addDays,
  createEventSchema,
  EVENT_RULES,
  type EventType,
  istToUtcIso,
  mapQuery,
  utcToIstParts,
  WEDDING_RULES,
  type WeddingEvent,
} from '@mmm/shared';
import type { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { TextArea } from '@/components/ui/text-area';
import { TextField } from '@/components/ui/text-field';

/** What the form holds: dates and times as typed, in IST. */
export type CeremonyValues = {
  name: string;
  day: string;
  time: string;
  /** End time on the same day, or the next morning if it's earlier than the start. */
  end: string;
  venueName: string;
  address: string;
  mapUrl: string;
  description: string;
  dressCode: string;
  livestreamUrl: string;
  showOnWebsite: boolean;
};

export type CeremonyField = keyof CeremonyValues;

export const emptyValues: CeremonyValues = {
  name: '',
  day: '',
  time: '',
  end: '',
  venueName: '',
  address: '',
  mapUrl: '',
  description: '',
  dressCode: '',
  livestreamUrl: '',
  showOnWebsite: true,
};

export function valuesFromEvent(event: WeddingEvent): CeremonyValues {
  const start = utcToIstParts(event.startsAt);
  return {
    name: event.name,
    day: start.day,
    time: start.time,
    end: event.endsAt ? utcToIstParts(event.endsAt).time : '',
    venueName: event.venueName ?? '',
    address: event.address ?? '',
    mapUrl: event.mapUrl ?? '',
    description: event.description ?? '',
    dressCode: event.dressCode ?? '',
    livestreamUrl: event.livestreamUrl ?? '',
    showOnWebsite: event.showOnWebsite,
  };
}

/** An end time earlier than the start is the next morning: 8 pm – 1 am (owner's decision). */
export const endsNextDay = (values: CeremonyValues) =>
  Boolean(values.end && values.time && values.end < values.time);

/** The request body: IST date and times as UTC moments; blanks become null on the API side. */
export function toPayload(values: CeremonyValues) {
  const startsAt = values.day && values.time ? istToUtcIso(values.day, values.time) : '';
  const endsAt =
    values.day && values.end
      ? istToUtcIso(endsNextDay(values) ? addDays(values.day, 1) : values.day, values.end)
      : null;
  return {
    name: values.name,
    startsAt,
    endsAt,
    venueName: values.venueName,
    address: values.address,
    mapUrl: values.mapUrl,
    description: values.description,
    dressCode: values.dressCode,
    livestreamUrl: values.livestreamUrl,
    showOnWebsite: values.showOnWebsite,
  };
}

/** The API's field names, as shown on this form. */
export const formField = (apiField: string | null | undefined): CeremonyField | null => {
  if (apiField === 'startsAt') return 'day';
  if (apiField === 'endsAt') return 'end';
  return apiField && apiField in emptyValues ? (apiField as CeremonyField) : null;
};

/** The shared rules, as the API applies them, shown next to each field. */
export function validateCeremony(
  values: CeremonyValues,
  type: EventType,
): Partial<Record<CeremonyField, string>> {
  const errors: Partial<Record<CeremonyField, string>> = {};
  for (const issue of createEventSchema.safeParse({ type, ...toPayload(values) }).error?.issues ??
    []) {
    const field = formField(String(issue.path[0] ?? ''));
    if (field) errors[field] ??= issue.message;
  }
  return errors;
}

/** "Open in Google Maps": the pasted link, or a search for the venue and address. */
function mapsHref(values: CeremonyValues): string | null {
  if (/^https?:\/\//.test(values.mapUrl.trim())) return values.mapUrl.trim();
  const query = mapQuery(values.venueName, values.address);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}

/** EVT-02: every detail of a ceremony, as on the add and edit pages. */
export function CeremonyFields({
  values,
  errors,
  onChange,
  before,
}: {
  values: CeremonyValues;
  errors: Partial<Record<CeremonyField, string>>;
  onChange: (patch: Partial<CeremonyValues>) => void;
  /** Shown above the fields, such as the choice of ceremony when adding one. */
  before?: ReactNode;
}) {
  const field = (name: Exclude<CeremonyField, 'showOnWebsite'>) => ({
    id: `ceremony-${name}`,
    value: values[name],
    error: errors[name],
    onChange: (e: { target: { value: string } }) => onChange({ [name]: e.target.value }),
  });
  const maps = mapsHref(values);

  return (
    <div className="space-y-8">
      {before}

      <section aria-labelledby="when-heading" className="space-y-5">
        <h2
          id="when-heading"
          className="text-sm font-semibold tracking-wide text-champagne-ink uppercase"
        >
          What and when
        </h2>
        <TextField
          label="Ceremony name"
          autoComplete="off"
          maxLength={WEDDING_RULES.eventNameMax}
          {...field('name')}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField label="Date" type="date" {...field('day')} />
          <TextField label="Starts (IST)" type="time" {...field('time')} />
          <div>
            <TextField label="Ends (optional)" type="time" {...field('end')} />
            {endsNextDay(values) && !errors.end && (
              <p className="mt-2 text-sm text-muted">Ends the next morning.</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="where-heading" className="space-y-5">
        <h2
          id="where-heading"
          className="text-sm font-semibold tracking-wide text-champagne-ink uppercase"
        >
          Where
        </h2>
        <TextField
          label="Venue (optional)"
          autoComplete="off"
          placeholder="Royal Garden"
          maxLength={EVENT_RULES.venueMax}
          {...field('venueName')}
        />
        <TextField
          label="Address (optional)"
          autoComplete="off"
          placeholder="Rajpur Road, Dehradun"
          maxLength={EVENT_RULES.addressMax}
          {...field('address')}
        />
        <div>
          <TextField
            label="Google Maps link (optional)"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://maps.app.goo.gl/…"
            {...field('mapUrl')}
          />
          <p className="mt-2 text-sm text-muted">
            In Google Maps, find the venue, tap Share and copy the link.{' '}
            {maps && (
              <a
                href={maps}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-aubergine underline underline-offset-4"
              >
                Open in Google Maps
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </p>
        </div>
      </section>

      <section aria-labelledby="more-heading" className="space-y-5">
        <h2
          id="more-heading"
          className="text-sm font-semibold tracking-wide text-champagne-ink uppercase"
        >
          For guests
        </h2>
        <TextField
          label="Dress code (optional)"
          autoComplete="off"
          placeholder="Green / Traditional"
          maxLength={EVENT_RULES.dressCodeMax}
          {...field('dressCode')}
        />
        <TextArea
          label="About this ceremony (optional)"
          hint="Shown to guests on the website and their invitation."
          maxLength={EVENT_RULES.descriptionMax}
          rows={3}
          {...field('description')}
        />
        <TextField
          label="YouTube Live link (optional)"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://youtube.com/live/…"
          {...field('livestreamUrl')}
        />
        <Switch
          label="Show on wedding website"
          hint="Turn off for a family-only ceremony: only guests invited to it will see it."
          checked={values.showOnWebsite}
          onChange={(showOnWebsite) => onChange({ showOnWebsite })}
        />
      </section>
    </div>
  );
}
