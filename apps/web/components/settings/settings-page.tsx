'use client';

import {
  addYears,
  todayInIst,
  updateWeddingSchema,
  type UpdateWeddingInput,
  type Wedding,
  WEDDING_RULES,
  weddingDateProblem,
} from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChangeLine } from '@/components/ui/change-line';
import { Container } from '@/components/ui/container';
import { TextArea } from '@/components/ui/text-area';
import { TextField } from '@/components/ui/text-field';
import { heading } from '@/components/ui/typography';
import { SlugField } from '@/components/wedding/slug-field';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';
import { weddingApi, weddingQueryKey } from '@/lib/wedding-api';
import { weddingDay } from '@/lib/wedding-format';

/** Wedding settings (PRD §27), for Admins. More settings join as their features are built. */
export function SettingsPage() {
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me });
  const wedding = useQuery({ queryKey: weddingQueryKey, queryFn: weddingApi.get });

  return (
    <Container className="max-w-4xl py-8 lg:py-10">
      <h1 className={heading.h2}>Settings</h1>
      {me.data && me.data.role !== 'admin' ? (
        <p className="mt-3 max-w-2xl text-body text-muted">
          Only Admins can change the wedding’s settings. Ask an Admin of your wedding.
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-body text-muted">
            Changes show straight away for everyone planning with you.
          </p>
          <section
            aria-labelledby="details-heading"
            className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8"
          >
            <h2 id="details-heading" className={heading.h3}>
              Wedding details
            </h2>
            {wedding.data && (
              <ChangeLine
                added={wedding.data.added}
                lastChanged={wedding.data.lastChanged}
                addedVerb="Set up"
                className="mt-1"
              />
            )}
            {wedding.isPending ? (
              <p role="status" className="mt-4 text-body text-muted">
                Loading…
              </p>
            ) : wedding.isError ? (
              <div role="alert" className="mt-4">
                <p className="text-body">{wedding.error.message}</p>
                <Button className="mt-4" onClick={() => void wedding.refetch()}>
                  Try again
                </Button>
              </div>
            ) : (
              <WeddingDetailsForm key={wedding.data.id} wedding={wedding.data} />
            )}
          </section>
        </>
      )}
    </Container>
  );
}

const FIELDS = ['brideName', 'groomName', 'title', 'date', 'city', 'description', 'slug'] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;

const toValues = (wedding: Wedding): Values => ({
  brideName: wedding.brideName,
  groomName: wedding.groomName,
  title: wedding.title,
  date: weddingDay(wedding.date),
  city: wedding.city,
  description: wedding.description ?? '',
  slug: wedding.slug,
});

/** WED-07, WED-08: the details from setup step 1, sending only what changed. */
function WeddingDetailsForm({ wedding }: { wedding: Wedding }) {
  const queryClient = useQueryClient();
  // What's saved; the form compares against it to send only the changes.
  const [original, setOriginal] = useState(() => toValues(wedding));
  const [values, setValues] = useState(original);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = todayInIst();

  const changesFrom = (current: Values): UpdateWeddingInput =>
    Object.fromEntries(
      FIELDS.filter((field) => current[field] !== original[field]).map((field) => [
        field,
        field === 'description' && !current.description.trim() ? null : current[field],
      ]),
    );
  const changes = changesFrom(values);
  const dirty = Object.keys(changes).length > 0;

  const validate = (current: Values) => {
    const next = changesFrom(current);
    const found: Partial<Record<Field, string>> = {};
    if (Object.keys(next).length === 0) return found;
    for (const issue of updateWeddingSchema.safeParse(next).error?.issues ?? []) {
      const field = issue.path[0] as Field | undefined;
      if (field) found[field] ??= issue.message;
    }
    // A changed date must be in range; an unchanged one may already have passed.
    if (next.date && !found.date) found.date = weddingDateProblem(next.date) ?? undefined;
    return Object.fromEntries(Object.entries(found).filter(([, message]) => message));
  };

  const save = useMutation({
    mutationFn: () => weddingApi.update(changes),
    onMutate: () => setSaved(false),
    onSuccess: async (updated) => {
      const savedValues = toValues(updated);
      setOriginal(savedValues);
      setValues(savedValues);
      queryClient.setQueryData(weddingQueryKey, updated);
      // The sidebar and overview show the title and date.
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      setSaved(true);
    },
    onError: (error) => {
      if (error instanceof ApiError && FIELDS.includes(error.field as Field)) {
        setErrors({ [error.field as Field]: error.message });
        document.getElementById(`settings-${error.field}`)?.focus();
      }
    },
  });
  const formError =
    save.error && !(save.error instanceof ApiError && FIELDS.includes(save.error.field as Field))
      ? save.error.message
      : null;

  const update = (field: Field, value: string) => {
    const next = { ...values, [field]: value };
    setValues(next);
    setSaved(false);
    if (submitted) setErrors(validate(next));
  };

  const submit = () => {
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    const firstInvalid = FIELDS.find((field) => found[field]);
    if (firstInvalid) {
      document.getElementById(`settings-${firstInvalid}`)?.focus();
      return;
    }
    if (dirty) save.mutate();
  };

  const field = (name: Field) => ({
    id: `settings-${name}`,
    value: values[name],
    error: errors[name],
    onChange: (e: { target: { value: string } }) => update(name, e.target.value),
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="mt-6 space-y-6"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Bride’s name"
          autoComplete="off"
          maxLength={WEDDING_RULES.coupleName.max}
          {...field('brideName')}
        />
        <TextField
          label="Groom’s name"
          autoComplete="off"
          maxLength={WEDDING_RULES.coupleName.max}
          {...field('groomName')}
        />
      </div>
      <TextField
        label="Wedding title"
        autoComplete="off"
        maxLength={WEDDING_RULES.title.max}
        {...field('title')}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          label="Wedding date"
          type="date"
          // A wedding that has already happened keeps its date; a new one must be from today.
          min={original.date < today ? undefined : today}
          max={addYears(today, WEDDING_RULES.maxYearsAhead)}
          {...field('date')}
        />
        <TextField
          label="City"
          autoComplete="address-level2"
          maxLength={WEDDING_RULES.city.max}
          {...field('city')}
        />
      </div>
      <TextArea
        label="About the wedding (optional)"
        hint="A line or two for your wedding website."
        maxLength={WEDDING_RULES.descriptionMax}
        rows={3}
        {...field('description')}
      />
      <SlugField
        id="settings-slug"
        value={values.slug}
        error={errors.slug}
        current={original.slug}
        locked={wedding.slugLocked}
        onChange={(slug) => update('slug', slug)}
      />

      <div className="flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
        <Button type="submit" loading={save.isPending} disabled={!dirty}>
          Save changes
        </Button>
        <Button
          variant="ghost"
          disabled={!dirty || save.isPending}
          onClick={() => {
            setValues(original);
            setErrors({});
            setSubmitted(false);
          }}
        >
          Undo changes
        </Button>
        <p aria-live="polite" className="text-sm sm:ml-2">
          {formError ? (
            <span className="text-terracotta-ink">{formError}</span>
          ) : (
            saved && !dirty && <span className="text-green-ink">Saved.</span>
          )}
        </p>
      </div>
    </form>
  );
}
