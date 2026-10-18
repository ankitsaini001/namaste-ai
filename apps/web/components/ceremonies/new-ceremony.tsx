'use client';

import { CEREMONY_PRESETS, type EventType, LIMITS, presetDefaultDay } from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { heading } from '@/components/ui/typography';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { eventsApi } from '@/lib/events-api';
import { eventsQueryKey, weddingApi, weddingQueryKey } from '@/lib/wedding-api';
import { weddingDay } from '@/lib/wedding-format';
import {
  CeremonyFields,
  type CeremonyField,
  type CeremonyValues,
  emptyValues,
  formField,
  toPayload,
  validateCeremony,
} from './ceremony-form';

const CHOICES: readonly { type: EventType; name: string; time: string }[] = [
  ...CEREMONY_PRESETS,
  { type: 'custom', name: 'Something else', time: '18:00' },
];
type Prefill = Pick<CeremonyValues, 'name' | 'day' | 'time'>;

/** EVT-01: add a ceremony, starting from a preset with its usual day and time. */
export function NewCeremony() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const wedding = useQuery({ queryKey: weddingQueryKey, queryFn: weddingApi.get });
  const events = useQuery({ queryKey: eventsQueryKey, queryFn: weddingApi.events });
  const [type, setType] = useState<EventType | null>(null);
  const [values, setValues] = useState<CeremonyValues>(emptyValues);
  // What the last choice filled in, so a new choice only replaces what wasn't typed over.
  const [prefill, setPrefill] = useState<Prefill>({ name: '', day: '', time: '' });
  const [errors, setErrors] = useState<Partial<Record<CeremonyField | 'type', string>>>({});
  const [submitted, setSubmitted] = useState(false);

  const create = useMutation({
    mutationFn: () => eventsApi.create({ type: type!, ...toPayload(values) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey });
      router.push('/app/ceremonies');
    },
    onError: (error) => {
      const field = error instanceof ApiError ? formField(error.field) : null;
      if (field) {
        setErrors({ [field]: error.message });
        document.getElementById(`ceremony-${field}`)?.focus();
      }
    },
  });

  const choose = (choice: (typeof CHOICES)[number]) => {
    const day = wedding.data ? weddingDay(wedding.data.date) : '';
    const next: Prefill = {
      name: choice.type === 'custom' ? '' : choice.name,
      day: (choice.type === 'custom' ? day : presetDefaultDay(choice.type, day)) ?? '',
      time: choice.time,
    };
    const updated = {
      ...values,
      ...Object.fromEntries(
        (Object.keys(next) as (keyof Prefill)[])
          .filter((key) => values[key] === prefill[key])
          .map((key) => [key, next[key]]),
      ),
    };
    setType(choice.type);
    setPrefill(next);
    setValues(updated);
    if (submitted) setErrors(validateCeremony(updated, choice.type));
  };

  const update = (patch: Partial<CeremonyValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    if (submitted && type) setErrors(validateCeremony(next, type));
  };

  const submit = () => {
    setSubmitted(true);
    if (!type) {
      setErrors({ type: 'Choose which ceremony this is.' });
      document.querySelector<HTMLInputElement>('input[name="ceremony-type"]')?.focus();
      return;
    }
    const found = validateCeremony(values, type);
    setErrors(found);
    const first = (Object.keys(found) as CeremonyField[])[0];
    if (first) {
      document.getElementById(`ceremony-${first}`)?.focus();
      return;
    }
    create.mutate();
  };

  const full = (events.data?.length ?? 0) >= LIMITS.events;
  const formError =
    create.error && !(create.error instanceof ApiError && formField(create.error.field))
      ? create.error.message
      : null;

  return (
    <Container className="max-w-3xl py-8 lg:py-10">
      <BackLink />
      <h1 className={`${heading.h2} mt-4`}>Add a ceremony</h1>

      {full ? (
        <div className="mt-6">
          <p className="text-body text-muted">
            A wedding can have up to {LIMITS.events} ceremonies, and yours has them all.
          </p>
          <ButtonLink href="/app/ceremonies" variant="secondary" className="mt-6">
            Back to ceremonies
          </ButtonLink>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8"
        >
          <CeremonyFields
            values={values}
            errors={errors}
            onChange={update}
            before={
              <fieldset aria-describedby={errors.type ? 'ceremony-type-error' : undefined}>
                <legend className="text-sm font-medium text-ink">Which ceremony?</legend>
                <p className="mt-1 text-sm text-muted">
                  We’ll fill in its usual day and time. You can change them.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CHOICES.map((choice) => (
                    <label key={choice.type} className="relative">
                      <input
                        type="radio"
                        name="ceremony-type"
                        value={choice.type}
                        checked={type === choice.type}
                        onChange={() => choose(choice)}
                        className="peer sr-only"
                      />
                      <span
                        className={cn(
                          'inline-flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-aubergine',
                          type === choice.type
                            ? 'border-aubergine bg-aubergine text-ivory'
                            : 'border-line bg-white text-ink hover:border-champagne hover:bg-sand',
                        )}
                      >
                        {choice.name}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.type && (
                  <p id="ceremony-type-error" className="mt-2 text-sm text-terracotta-ink">
                    {errors.type}
                  </p>
                )}
              </fieldset>
            }
          />
          {formError && (
            <p
              role="alert"
              className="mt-6 rounded-xl bg-terracotta-tint px-4 py-3 text-sm text-terracotta-ink"
            >
              {formError}
            </p>
          )}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
            <ButtonLink href="/app/ceremonies" variant="ghost">
              Cancel
            </ButtonLink>
            <Button type="submit" loading={create.isPending}>
              Add ceremony
            </Button>
          </div>
        </form>
      )}
    </Container>
  );
}

export function BackLink() {
  return (
    <Link
      href="/app/ceremonies"
      className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-muted hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
      All ceremonies
    </Link>
  );
}
