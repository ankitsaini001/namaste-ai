'use client';

import { type CreateWeddingInput, istToUtcIso } from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AppHeader } from '@/components/app/app-header';
import { Container } from '@/components/ui/container';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';
import {
  clearSetupDraft,
  loadSetupDraft,
  saveSetupDraft,
  type SetupDraft,
} from '@/lib/setup-draft';
import { weddingApi } from '@/lib/wedding-api';
import { CeremoniesStep, weddingRow } from './ceremonies-step';
import { DETAIL_FIELDS, DetailsStep } from './details-step';

/** Sends people to the right place, then runs the two setup steps. */
export function SetupFlow() {
  const router = useRouter();
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me });
  const leaving = useRef(false);

  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  const needsName = me.data?.needsName === true;
  const hasWedding = Boolean(me.data?.wedding);

  useEffect(() => {
    if (leaving.current) return;
    if (signedOut) router.replace('/login?returnTo=/setup');
    else if (needsName) router.replace('/login?step=name&returnTo=/setup');
    else if (hasWedding) router.replace('/app');
  }, [signedOut, needsName, hasWedding, router]);

  const ready = me.data && !needsName && !hasWedding;
  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader
        name={ready ? me.data.user.name : undefined}
        onLeave={() => (leaving.current = true)}
      />
      <main id="main">
        <Container className="max-w-3xl py-8 lg:py-12">
          {ready ? (
            <SetupWizard userId={me.data.user.id} />
          ) : me.isError && !signedOut ? (
            <p role="alert" className="text-body">
              {me.error.message}
            </p>
          ) : (
            <p role="status" className="text-body text-muted">
              Loading…
            </p>
          )}
        </Container>
      </main>
    </div>
  );
}

type ServerError = { field: string | null; message: string };

const emptyDraft = (userId: string): SetupDraft => ({
  userId,
  step: 'details',
  details: {
    brideName: '',
    groomName: '',
    title: '',
    titleEdited: false,
    date: '',
    city: '',
    description: '',
    slug: '',
    slugEdited: false,
  },
  ceremonies: [],
});

/** The request for POST /v1/wedding. Ceremony times are entered in IST. */
function toRequest(draft: SetupDraft): CreateWeddingInput {
  const d = draft.details;
  return {
    brideName: d.brideName,
    groomName: d.groomName,
    title: d.title,
    date: d.date,
    city: d.city,
    description: d.description.trim() ? d.description : null,
    slug: d.slug,
    events: draft.ceremonies.map((c) => ({
      type: c.type as CreateWeddingInput['events'][number]['type'],
      name: c.name,
      startsAt: c.day && c.time ? istToUtcIso(c.day, c.time) : '',
      showOnWebsite: c.showOnWebsite,
    })),
  };
}

function SetupWizard({ userId }: { userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SetupDraft>(
    () => loadSetupDraft(userId) ?? emptyDraft(userId),
  );
  const [serverError, setServerError] = useState<ServerError | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => saveSetupDraft(draft), [draft]);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [draft.step]);

  const create = useMutation({
    mutationFn: () => weddingApi.create(toRequest(draft)),
    onMutate: () => setServerError(null),
    onSuccess: async () => {
      clearSetupDraft();
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      router.replace('/app');
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'ALREADY_IN_WEDDING') {
        clearSetupDraft();
        void queryClient.invalidateQueries({ queryKey: meQueryKey });
        router.replace('/app');
        return;
      }
      const field = error instanceof ApiError ? error.field : null;
      setServerError({ field, message: error.message });
      // A problem with the details (say, the address was taken meanwhile) is fixed on step 1.
      if (DETAIL_FIELDS.some((name) => name === field)) {
        setDraft((d) => ({ ...d, step: 'details' }));
      }
    },
  });

  const stepNumber = draft.step === 'details' ? 1 : 2;
  return (
    <>
      <p className="text-eyebrow font-semibold text-champagne-ink uppercase">
        Step {stepNumber} of 2
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-serif text-h2 font-normal tracking-[-0.015em] focus:outline-none lg:text-[40px]"
      >
        {draft.step === 'details' ? 'Your wedding' : 'Your ceremonies'}
      </h1>
      <p className="mt-3 text-body text-muted">
        {draft.step === 'details'
          ? 'Start with the couple and the main day. You can change all of this later.'
          : 'Add each ceremony you’re celebrating. Times are in India time (IST). Hide family-only ceremonies from your wedding website.'}
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-8">
        {draft.step === 'details' ? (
          <DetailsStep
            value={draft.details}
            serverError={
              serverError?.field ? { field: serverError.field, message: serverError.message } : null
            }
            onChange={(details) => {
              setServerError(null);
              setDraft((d) => ({ ...d, details }));
            }}
            onNext={() =>
              setDraft((d) => ({
                ...d,
                step: 'ceremonies',
                // Most families start from the wedding itself.
                ceremonies: d.ceremonies.length ? d.ceremonies : [weddingRow(d.details.date)],
              }))
            }
          />
        ) : (
          <CeremoniesStep
            weddingDay={draft.details.date}
            value={draft.ceremonies}
            onChange={(ceremonies) => {
              setServerError(null);
              setDraft((d) => ({ ...d, ceremonies }));
            }}
            onBack={() => {
              setServerError(null);
              setDraft((d) => ({ ...d, step: 'details' }));
            }}
            submitting={create.isPending}
            serverError={serverError}
            onSubmit={() => create.mutate()}
          />
        )}
      </div>
    </>
  );
}
