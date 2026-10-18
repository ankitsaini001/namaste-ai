'use client';

import { type JoinDetails, maskEmail } from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';
import { organisersApi, ROLE_LABEL } from '@/lib/organisers-api';
import { LoginFlow } from './login-flow';

const headingClass =
  'font-serif text-[30px] leading-tight font-normal tracking-[-0.015em] sm:text-4xl';

/**
 * The organiser join link (ORG-02, ORG-03; UX brief, Screen 4): the invitation, then the usual
 * sign-in, then joining. Someone already signed in joins straight away.
 */
export function JoinFlow({ token }: { token: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const details = useQuery({
    queryKey: ['join', token],
    queryFn: () => organisersApi.joinDetails(token),
    retry: false,
  });
  // A new sign-in after "Log out" starts a fresh LoginFlow.
  const [attempt, setAttempt] = useState(0);
  const joining = useRef(false);
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me, retry: false });
  const hasWedding = Boolean(me.data?.wedding);

  const accept = useMutation({
    mutationFn: () => organisersApi.accept(token),
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me);
      router.replace('/app');
    },
    onError: () => {
      joining.current = false;
    },
  });
  // Signed in with the wrong email: log out here and show the sign-in again, on this page.
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: meQueryKey });
      accept.reset();
      setAttempt((n) => n + 1);
    },
  });

  if (details.isPending) {
    return (
      <p role="status" className="text-body text-muted">
        Opening your invitation…
      </p>
    );
  }
  if (details.isError) {
    return <LinkProblem message={details.error.message} hasWedding={hasWedding} />;
  }

  const error = accept.error instanceof ApiError ? accept.error : null;
  if (error?.code === 'JOIN_LINK_EXPIRED' || error?.code === 'JOIN_LINK_INVALID') {
    return <LinkProblem message={error.message} hasWedding={hasWedding} />;
  }
  if (error?.code === 'ALREADY_IN_WEDDING') {
    return (
      <>
        <h1 className={headingClass}>You already plan a wedding</h1>
        <p className="mt-3 text-body text-muted">{error.message}</p>
        <ButtonLink href="/app" className="mt-8 w-full">
          Go to your wedding
        </ButtonLink>
      </>
    );
  }
  if (error?.code === 'JOIN_EMAIL_MISMATCH') {
    return (
      <>
        <Invitation details={details.data} />
        <h1 className={headingClass}>Use the invited email</h1>
        <p role="alert" className="mt-3 text-body text-ink">
          {error.message}
        </p>
        <Button className="mt-8 w-full" loading={logout.isPending} onClick={() => logout.mutate()}>
          Log out and sign in again
        </Button>
      </>
    );
  }
  if (accept.isPending || accept.isSuccess) {
    return (
      <>
        <Invitation details={details.data} />
        <p role="status" className="text-body text-muted">
          Joining {details.data.weddingTitle}…
        </p>
      </>
    );
  }

  return (
    <>
      <LoginFlow
        key={attempt}
        returnTo={`/join/${token}`}
        initialStep="email"
        heading="Join the wedding"
        subheading="Sign in with the email address your invitation was sent to. No passwords to remember."
        intro={<Invitation details={details.data} />}
        // The invited name only fits someone signing in with the invited email.
        suggestName={(email) =>
          maskEmail(email.toLowerCase()) === details.data.emailHint
            ? details.data.invitedName
            : undefined
        }
        onSignedIn={() => {
          if (joining.current) return;
          joining.current = true;
          accept.mutate();
        }}
      />
      {accept.isError && !error?.code.startsWith('JOIN') && (
        <p role="alert" className="mt-4 text-sm text-terracotta-ink">
          {accept.error.message}
        </p>
      )}
    </>
  );
}

/** "Diya has invited you to help plan Aarav & Diya's wedding as a Manager." */
function Invitation({ details }: { details: JoinDetails }) {
  const inviter = details.inviterName ?? 'Someone';
  return (
    <div className="mb-8 flex gap-3 rounded-xl border-l-2 border-champagne bg-sand px-4 py-4">
      <span
        aria-hidden="true"
        className="mt-0.5 h-6 w-5 shrink-0 rounded-t-full border border-b-0 border-champagne-ink"
      />
      <div>
        <p className="text-[15px] text-ink">
          {inviter} has invited you to help plan {details.weddingTitle} as{' '}
          {details.role === 'admin' ? 'an' : 'a'} {ROLE_LABEL[details.role]}.
        </p>
        <p className="mt-1 text-sm text-muted">Please sign in with {details.emailHint}.</p>
      </div>
    </div>
  );
}

/** A link that can't be used. Someone already in a wedding, perhaps this one, can go to it. */
function LinkProblem({ message, hasWedding }: { message: string; hasWedding: boolean }) {
  return (
    <>
      <h1 className={headingClass}>This invitation link doesn’t work</h1>
      <p className="mt-3 text-body text-muted">{message}</p>
      {hasWedding ? (
        <ButtonLink href="/app" className="mt-8 w-full">
          Go to your wedding
        </ButtonLink>
      ) : (
        <ButtonLink href="/login" variant="secondary" className="mt-8 w-full">
          Go to login
        </ButtonLink>
      )}
    </>
  );
}
