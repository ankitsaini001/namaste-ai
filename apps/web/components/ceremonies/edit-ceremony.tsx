'use client';

import { type EventImpact, type UpdateEventInput, type WeddingEvent } from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { ChangeLine } from '@/components/ui/change-line';
import { ConfirmPanel, useConfirm } from '@/components/ui/confirm';
import { Container } from '@/components/ui/container';
import { heading } from '@/components/ui/typography';
import { ApiError } from '@/lib/api-client';
import { eventQueryKey, eventsApi } from '@/lib/events-api';
import { eventsQueryKey, weddingApi } from '@/lib/wedding-api';
import {
  CeremonyFields,
  type CeremonyField,
  type CeremonyValues,
  formField,
  toPayload,
  validateCeremony,
  valuesFromEvent,
} from './ceremony-form';
import { BackLink } from './new-ceremony';

const TYPE_LABEL: Record<WeddingEvent['type'], string> = {
  engagement: 'Engagement',
  roka: 'Roka',
  mehendi: 'Mehendi',
  haldi: 'Haldi',
  sangeet: 'Sangeet',
  cocktail: 'Cocktail',
  wedding: 'Wedding',
  reception: 'Reception',
  custom: 'Custom ceremony',
};

/** EVT-01, EVT-02, EVT-06: change any detail, or delete the ceremony. */
export function EditCeremony({ id }: { id: string }) {
  const event = useQuery({ queryKey: eventQueryKey(id), queryFn: () => eventsApi.get(id) });

  return (
    <Container className="max-w-3xl py-8 lg:py-10">
      <BackLink />
      {event.isPending ? (
        <p role="status" className="mt-6 text-body text-muted">
          Loading…
        </p>
      ) : event.isError ? (
        <div role="alert" className="mt-6">
          <h1 className={heading.h2}>
            {event.error instanceof ApiError && event.error.status === 404
              ? 'Ceremony not found'
              : 'Something went wrong'}
          </h1>
          <p className="mt-3 text-body text-muted">{event.error.message}</p>
          <ButtonLink href="/app/ceremonies" variant="secondary" className="mt-6">
            Back to ceremonies
          </ButtonLink>
        </div>
      ) : (
        <CeremonyEditor key={event.data.id} event={event.data} />
      )}
    </Container>
  );
}

function CeremonyEditor({ event }: { event: WeddingEvent }) {
  const queryClient = useQueryClient();
  // What's saved; only the fields that differ from it are sent.
  const [original, setOriginal] = useState(() => valuesFromEvent(event));
  const [values, setValues] = useState(original);
  const [errors, setErrors] = useState<Partial<Record<CeremonyField, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const before = toPayload(original);
  const after = toPayload(values);
  const changes = Object.fromEntries(
    (Object.keys(after) as (keyof typeof after)[])
      .filter((key) => after[key] !== before[key])
      .map((key) => [key, after[key]]),
  ) as UpdateEventInput;
  const dirty = Object.keys(changes).length > 0;

  const save = useMutation({
    mutationFn: () => eventsApi.update(event.id, changes),
    onMutate: () => setSaved(false),
    onSuccess: async (updated) => {
      const savedValues = valuesFromEvent(updated);
      setOriginal(savedValues);
      setValues(savedValues);
      setSaved(true);
      queryClient.setQueryData(eventQueryKey(event.id), updated);
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey, exact: true });
    },
    onError: (error) => {
      const field = error instanceof ApiError ? formField(error.field) : null;
      if (field) {
        setErrors({ [field]: error.message });
        document.getElementById(`ceremony-${field}`)?.focus();
      }
    },
  });

  const update = (patch: Partial<CeremonyValues>) => {
    const next = { ...values, ...patch };
    setValues(next);
    setSaved(false);
    if (submitted) setErrors(validateCeremony(next, event.type));
  };

  const submit = () => {
    setSubmitted(true);
    const found = validateCeremony(values, event.type);
    setErrors(found);
    const first = (Object.keys(found) as CeremonyField[])[0];
    if (first) {
      document.getElementById(`ceremony-${first}`)?.focus();
      return;
    }
    if (dirty) save.mutate();
  };

  const formError =
    save.error && !(save.error instanceof ApiError && formField(save.error.field))
      ? save.error.message
      : null;

  return (
    <>
      <h1 className={`${heading.h2} mt-4`}>{event.name}</h1>
      <p className="mt-2 text-sm text-muted">{TYPE_LABEL[event.type]}</p>
      <ChangeLine added={event.added} lastChanged={event.lastChanged} both className="mt-2" />

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8"
      >
        <CeremonyFields values={values} errors={errors} onChange={update} />
        {formError && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-terracotta-tint px-4 py-3 text-sm text-terracotta-ink"
          >
            {formError}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
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
            {saved && !dirty && <span className="text-green-ink">Saved.</span>}
          </p>
        </div>
      </form>

      <DeleteSection event={event} />
    </>
  );
}

/** EVT-06: say what deleting will do, then do it. A wedding keeps at least one ceremony. */
function DeleteSection({ event }: { event: WeddingEvent }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const events = useQuery({ queryKey: eventsQueryKey, queryFn: weddingApi.events });
  const impact = useQuery({
    queryKey: [...eventQueryKey(event.id), 'impact'],
    queryFn: () => eventsApi.get(event.id, { withImpact: true }).then((e) => e.impact!),
    enabled: confirm.asking,
  });
  const remove = useMutation({
    mutationFn: () => eventsApi.remove(event.id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: eventQueryKey(event.id) });
      await queryClient.invalidateQueries({ queryKey: eventsQueryKey, exact: true });
      router.push('/app/ceremonies');
    },
  });
  const onlyOne = events.data?.length === 1;

  return (
    <section aria-labelledby="delete-heading" className="mt-12 border-t border-line pt-8">
      <h2 id="delete-heading" className={heading.h3}>
        Delete this ceremony
      </h2>
      {onlyOne ? (
        <p className="mt-2 text-sm text-muted">
          This is the wedding’s only ceremony. Add another ceremony first.
        </p>
      ) : (
        <>
          <p className="mt-2 max-w-xl text-sm text-muted">
            This can’t be undone. You’ll see what it affects before anything is deleted.
          </p>
          <Button
            ref={confirm.triggerRef}
            variant="secondary"
            className="mt-4"
            aria-expanded={confirm.asking}
            onClick={confirm.open}
          >
            Delete {event.name}
          </Button>
          {confirm.asking && (
            <ConfirmPanel
              question={`Delete ${event.name}?`}
              confirmLabel="Delete ceremony"
              pending={remove.isPending || impact.isPending}
              onConfirm={() => remove.mutate()}
              onKeep={confirm.close}
            >
              <ImpactList impact={impact.data} loading={impact.isPending} />
            </ConfirmPanel>
          )}
          {(remove.error ?? impact.error) && (
            <p role="alert" className="mt-3 text-sm text-terracotta-ink">
              {(remove.error ?? impact.error)!.message}
            </p>
          )}
        </>
      )}
    </section>
  );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

function ImpactList({ impact, loading }: { impact?: EventImpact; loading: boolean }) {
  if (loading || !impact) return <p className="mt-1">Checking what it affects…</p>;
  const effects = [
    impact.invitationsRemoved > 0 &&
      `${plural(impact.invitationsRemoved, 'invitation and its RSVP', 'invitations and their RSVPs')} will be removed.`,
    impact.tasksUnlinked > 0 &&
      `${plural(impact.tasksUnlinked, 'task', 'tasks')} will no longer be linked to it.`,
    impact.shoppingUnlinked > 0 &&
      `${plural(impact.shoppingUnlinked, 'shopping item', 'shopping items')} will no longer be linked to it.`,
    impact.expensesUnlinked > 0 &&
      `${plural(impact.expensesUnlinked, 'expense', 'expenses')} will no longer be linked to it.`,
    impact.vendorsUnlinked > 0 &&
      `${plural(impact.vendorsUnlinked, 'vendor', 'vendors')} will no longer be linked to it.`,
    impact.photosMovedToGeneral > 0 &&
      `${plural(impact.photosMovedToGeneral, 'photo', 'photos')} will move to the General album.`,
  ].filter(Boolean);
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-5">
      <li>Its photo album will be deleted.</li>
      {effects.length > 0 ? (
        effects.map((effect) => <li key={effect as string}>{effect}</li>)
      ) : (
        <li>Nothing else is linked to it yet.</li>
      )}
    </ul>
  );
}
