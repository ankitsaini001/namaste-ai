'use client';

import { SLUG_MESSAGES, slugProblem, WEDDING_RULES } from '@mmm/shared';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { weddingApi } from '@/lib/wedding-api';

export const slugQuery = (slug: string) => ({
  queryKey: ['slug-available', slug],
  queryFn: () => weddingApi.slugAvailable(slug),
  staleTime: 30_000,
});

/**
 * The website address with its live availability check (WED-04), in setup and in Settings. The
 * wedding's own address (`current`) isn't checked; a published website's address is `locked`
 * (WED-08).
 */
export function SlugField({
  id = 'setup-slug',
  value,
  error,
  onChange,
  onTaken,
  takenNote = null,
  current,
  locked = false,
}: {
  id?: string;
  value: string;
  error: string | undefined;
  onChange: (slug: string) => void;
  /** Set while the address is a suggestion: called instead of showing "taken". */
  onTaken?: () => void;
  takenNote?: string | null;
  current?: string;
  locked?: boolean;
}) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 400);
    return () => clearTimeout(timer);
  }, [value]);

  const unchanged = current !== undefined && value === current;
  const problem = value ? slugProblem(value) : null;
  const availability = useQuery({
    ...slugQuery(debounced),
    enabled:
      !unchanged && debounced === value && debounced !== '' && slugProblem(debounced) === null,
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
  const shownError = error ?? (unchanged ? undefined : liveError);
  const checking =
    !unchanged &&
    !shownError &&
    !problem &&
    value !== '' &&
    (debounced !== value || availability.isFetching || trySuggestion);
  const available = !unchanged && !shownError && !checking && availability.data?.available === true;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        Website address
      </label>
      <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
        {locked
          ? 'Your website has been published, so its address can’t change any more.'
          : 'Guests open your wedding website here. You can change it until the website is published.'}
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
          id={id}
          readOnly={locked}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={WEDDING_RULES.slug.max}
          value={value}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={`${id}-hint ${id}-status`}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-base text-ink focus:outline-none focus-visible:outline-none"
        />
      </div>
      <p
        id={`${id}-status`}
        aria-live="polite"
        className={cn(
          'mt-2 min-h-5 text-sm',
          shownError ? 'text-terracotta-ink' : available ? 'text-green-ink' : 'text-muted',
        )}
      >
        {shownError ? (
          shownError
        ) : unchanged ? (
          'This is your current address.'
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
