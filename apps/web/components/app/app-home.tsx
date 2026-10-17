'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';
import { AppHeader } from './app-header';
import { Overview } from './overview';

/** Signed-in home: sends people to login, the name step or setup, then shows the overview. */
export function AppHome() {
  const router = useRouter();
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me });
  // Set while logging out, so the 401 that follows doesn't redirect with ?returnTo=/app.
  const leaving = useRef(false);

  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  const needsName = me.data?.needsName === true;
  const needsSetup = me.data !== undefined && !needsName && me.data.wedding === null;
  const redirecting = signedOut || needsName || needsSetup;

  useEffect(() => {
    if (leaving.current) return;
    if (signedOut) router.replace('/login?returnTo=/app');
    else if (needsName) router.replace('/login?step=name&returnTo=/app');
    else if (needsSetup) router.replace('/setup');
  }, [signedOut, needsName, needsSetup, router]);

  return (
    <div className="min-h-screen bg-ivory">
      <AppHeader
        name={me.data && !redirecting ? me.data.user.name : undefined}
        role={me.data?.role}
        onLeave={() => (leaving.current = true)}
      />
      <main id="main">
        <Container className="py-8 lg:py-12">
          {me.isPending || redirecting ? (
            <p role="status" className="text-body text-muted">
              Loading your wedding…
            </p>
          ) : me.isError ? (
            <div role="alert" className="max-w-lg">
              <p className="text-body">{me.error.message}</p>
              <Button className="mt-6" onClick={() => void me.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <Overview />
          )}
        </Container>
      </main>
    </div>
  );
}
