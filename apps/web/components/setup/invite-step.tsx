'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { InviteForm } from '@/components/organisers/invite-form';
import { Button } from '@/components/ui/button';
import { meQueryKey } from '@/lib/auth-api';
import { organisersApi, organisersQueryKey, ROLE_LABEL } from '@/lib/organisers-api';
import { weddingApi } from '@/lib/wedding-api';

/** Setup step 3 (WED-01): invite the family who'll help plan, or skip for now. */
export function InviteFamilyStep() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: organisersQueryKey, queryFn: organisersApi.list });
  const invited = team.data?.invites ?? [];
  const headingRef = useRef<HTMLHeadingElement>(null);

  // This step replaces step 2 on screen: announce it.
  useEffect(() => headingRef.current?.focus(), []);

  const finish = useMutation({
    mutationFn: () => weddingApi.setupStep('done'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      router.replace('/app');
    },
  });

  return (
    <>
      <p className="text-eyebrow font-semibold text-champagne-ink uppercase">Step 3 of 3</p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 font-serif text-h2 font-normal tracking-[-0.015em] focus:outline-none lg:text-[40px]"
      >
        Invite your family
      </h1>
      <p className="mt-3 text-body text-muted">
        Your wedding is ready. Invite anyone helping you plan: parents, siblings, cousins. They’ll
        get an email with a link to join. You can also do this later from Organisers.
      </p>

      <div className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8">
        <InviteForm idPrefix="setup-invite" />

        {invited.length > 0 && (
          <section aria-labelledby="invited-heading" className="mt-8 border-t border-line pt-6">
            <h2 id="invited-heading" className="text-sm font-medium text-ink">
              Invited so far ({invited.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {invited.map((invite) => (
                <li key={invite.id} className="text-sm text-ink">
                  {invite.name}{' '}
                  <span className="text-muted">
                    · {invite.email} · {ROLE_LABEL[invite.role]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          {finish.isError && (
            <p role="alert" className="text-sm text-terracotta-ink sm:mr-auto sm:self-center">
              {finish.error.message}
            </p>
          )}
          <Button
            variant={invited.length > 0 ? 'primary' : 'secondary'}
            loading={finish.isPending}
            onClick={() => finish.mutate()}
          >
            {invited.length > 0 ? 'Go to your wedding' : 'Skip for now'}
          </Button>
        </div>
      </div>
    </>
  );
}
