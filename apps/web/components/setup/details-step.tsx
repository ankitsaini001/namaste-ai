'use client';

import {
  addYears,
  alternativeSlug,
  createWeddingSchema,
  defaultWeddingTitle,
  SLUG_MESSAGES,
  slugProblem,
  suggestSlug,
  todayInIst,
  WEDDING_RULES,
} from '@mmm/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/text-area';
import { TextField } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import type { SetupDraft } from '@/lib/setup-draft';
import { weddingApi } from '@/lib/wedding-api';

type Details = SetupDraft['details'];
type Field = 'brideName' | 'groomName' | 'title' | 'date' | 'city' | 'description' | 'slug';
type Errors = Partial<Record<Field, string>>;

export const DETAIL_FIELDS: readonly Field[] = [
  'brideName',
  'groomName',
  'title',
  'date',
  'city',
  'description',
  'slug',
];

const detailsSchema = createWeddingSchema.pick({
  brideName: true,
  groomName: true,
  title: true,
  date: true,
  city: true,
  description: true,
  slug: true,
});

function validate(value: Details): Errors {
  const result = detailsSchema.safeParse(value);
  const errors: Errors = {};
  for (const issue of result.error?.issues ?? []) {
    const field = issue.path[0] as Field;
    errors[field] ??= issue.message;
  }
  return errors;
}

const autoSlug = (bride: string, groom: string) =>
  bride.trim() || groom.trim() ? suggestSlug(bride, groom) : '';

/** The addresses suggested in turn: from the names, then with the wedding year (WED-04). */
function suggestions(details: Details, today: string): string[] {
  const base = autoSlug(details.brideName, details.groomName);
  if (!base) return [];
  const year = (details.date || today).slice(0, 4);
  return [base, ...Array.from({ length: 9 }, (_, i) => alternativeSlug(base, year, i + 1))];
}

const slugQuery = (slug: string) => ({
  queryKey: ['slug-available', slug],
  queryFn: () => weddingApi.slugAvailable(slug),
  staleTime: 30_000,
});

/**
 * Step 1 (WED-01): the couple, title, date, city, description and website address. The title and
 * address fill in from the names until the person changes them (WED-03, WED-04).
 */
export function DetailsStep({
  value,
  serverError,
  onChange,
  onNext,
}: {
  value: Details;
  serverError: { field: string; message: string } | null;
  onChange: (value: Details) => void;
  onNext: () => void;
}) {
  const queryClient = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [checking, setChecking] = useState(false);
  const today = todayInIst();

  const update = (patch: Partial<Details>) => {
    const next = { ...value, ...patch };
    if ('brideName' in patch || 'groomName' in patch) {
      if (!next.titleEdited) next.title = defaultWeddingTitle(next.brideName, next.groomName);
      if (!next.slugEdited) next.slug = autoSlug(next.brideName, next.groomName);
    }
    if ('title' in patch) {
      next.titleEdited = next.title !== defaultWeddingTitle(next.brideName, next.groomName);
    }
    if ('slug' in patch) {
      next.slugEdited = next.slug !== autoSlug(next.brideName, next.groomName);
    }
    if (submitted) setErrors(validate(next));
    onChange(next);
  };

  // While the address is still our suggestion, a taken one moves on to the next suggestion.
  const suggested = value.slugEdited ? [] : suggestions(value, today);
  const position = suggested.indexOf(value.slug);
  const nextSuggestion = position >= 0 ? suggested[position + 1] : undefined;
  const replaceTaken = nextSuggestion
    ? () => {
        const next = { ...value, slug: nextSuggestion };
        if (submitted) setErrors(validate(next));
        onChange(next);
      }
    : undefined;

  const errorFor = (field: Field) =>
    errors[field] ?? (serverError?.field === field ? serverError.message : undefined);

  async function next() {
    setSubmitted(true);
    const found = validate(value);
    setErrors(found);
    const firstInvalid = DETAIL_FIELDS.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(`setup-${firstInvalid}`)?.focus();
      return;
    }
    // Check the address once more before moving on; the API checks again when creating.
    setChecking(true);
    try {
      const result = await queryClient.fetchQuery(slugQuery(value.slug));
      if (!result.available) {
        setErrors({ slug: SLUG_MESSAGES[result.reason ?? 'taken'] });
        document.getElementById('setup-slug')?.focus();
        return;
      }
    } catch {
      // Offline or the check failed: carry on, creating the wedding checks the address too.
    } finally {
      setChecking(false);
    }
    onNext();
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void next();
      }}
      className="space-y-6"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          id="setup-brideName"
          label="Bride’s name"
          autoComplete="off"
          maxLength={WEDDING_RULES.coupleName.max}
          value={value.brideName}
          error={errorFor('brideName')}
          onChange={(e) => update({ brideName: e.target.value })}
        />
        <TextField
          id="setup-groomName"
          label="Groom’s name"
          autoComplete="off"
          maxLength={WEDDING_RULES.coupleName.max}
          value={value.groomName}
          error={errorFor('groomName')}
          onChange={(e) => update({ groomName: e.target.value })}
        />
      </div>

      <TextField
        id="setup-title"
        label="Wedding title"
        autoComplete="off"
        maxLength={WEDDING_RULES.title.max}
        placeholder="Princi & Akshay"
        value={value.title}
        error={errorFor('title')}
        onChange={(e) => update({ title: e.target.value })}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          id="setup-date"
          label="Wedding date"
          type="date"
          min={today}
          max={addYears(today, WEDDING_RULES.maxYearsAhead)}
          value={value.date}
          error={errorFor('date')}
          onChange={(e) => update({ date: e.target.value })}
        />
        <TextField
          id="setup-city"
          label="City"
          autoComplete="address-level2"
          maxLength={WEDDING_RULES.city.max}
          placeholder="Jaipur"
          value={value.city}
          error={errorFor('city')}
          onChange={(e) => update({ city: e.target.value })}
        />
      </div>

      <TextArea
        id="setup-description"
        label="About the wedding (optional)"
        hint="A line or two for your wedding website."
        maxLength={WEDDING_RULES.descriptionMax}
        rows={3}
        value={value.description}
        error={errorFor('description')}
        onChange={(e) => update({ description: e.target.value })}
      />

      <SlugField
        value={value.slug}
        error={errorFor('slug')}
        onChange={(slug) => update({ slug })}
        onTaken={replaceTaken}
        takenNote={position > 0 ? `“${suggested[0]}” is taken, so we added the year.` : null}
      />

      <div className="flex justify-end border-t border-line pt-6">
        <Button type="submit" loading={checking} className="w-full sm:w-auto">
          Continue to ceremonies
        </Button>
      </div>
    </form>
  );
}

/** The website address with its live availability check (WED-04). */
function SlugField({
  value,
  error,
  onChange,
  onTaken,
  takenNote,
}: {
  value: string;
  error: string | undefined;
  onChange: (slug: string) => void;
  /** Set while the address is a suggestion: called instead of showing "taken". */
  onTaken?: () => void;
  takenNote: string | null;
}) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 400);
    return () => clearTimeout(timer);
  }, [value]);

  const problem = value ? slugProblem(value) : null;
  const availability = useQuery({
    ...slugQuery(debounced),
    enabled: debounced === value && debounced !== '' && slugProblem(debounced) === null,
  });

  const taken =
    debounced === value &&
    availability.data?.available === false &&
    availability.data.reason === 'taken';
  const trySuggestion = taken && onTaken !== undefined;
  useEffect(() => {
    if (trySuggestion) onTaken?.();
  }, [trySuggestion, onTaken]);

  // A form error wins; otherwise show what the live check found as the person types.
  const liveError =
    problem && value.length >= WEDDING_RULES.slug.min
      ? SLUG_MESSAGES[problem]
      : availability.data && !availability.data.available && debounced === value && !trySuggestion
        ? SLUG_MESSAGES[availability.data.reason ?? 'taken']
        : undefined;
  const shownError = error ?? liveError;
  const checking =
    !shownError &&
    !problem &&
    value !== '' &&
    (debounced !== value || availability.isFetching || trySuggestion);
  const available = !shownError && !checking && availability.data?.available === true;

  return (
    <div>
      <label htmlFor="setup-slug" className="block text-sm font-medium text-ink">
        Website address
      </label>
      <p id="setup-slug-hint" className="mt-1 text-sm text-muted">
        Guests open your wedding website here. You can change it until the website is published.
      </p>
      <div
        className={cn(
          'mt-2 flex h-13 w-full items-center overflow-hidden rounded-xl border bg-white focus-within:ring-4',
          shownError
            ? 'border-terracotta focus-within:ring-terracotta/15'
            : 'border-line focus-within:border-champagne focus-within:ring-champagne/25',
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-full shrink-0 items-center border-r border-line bg-sand px-3 text-sm text-muted"
        >
          makemymarriage.com/w/
        </span>
        <input
          id="setup-slug"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={WEDDING_RULES.slug.max}
          value={value}
          aria-invalid={shownError ? true : undefined}
          aria-describedby="setup-slug-hint setup-slug-status"
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-ink focus:outline-none focus-visible:outline-none"
        />
      </div>
      <p
        id="setup-slug-status"
        aria-live="polite"
        className={cn(
          'mt-2 min-h-5 text-sm',
          shownError ? 'text-terracotta-ink' : available ? 'text-green-ink' : 'text-muted',
        )}
      >
        {shownError ? (
          shownError
        ) : checking ? (
          'Checking…'
        ) : available ? (
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            This address is available.{takenNote && ` ${takenNote}`}
          </span>
        ) : null}
      </p>
    </div>
  );
}
