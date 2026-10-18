'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';
import { AppShell } from './app-shell';

/**
 * Every page under /app: sends people to login, the name step or setup first, then shows the
 * page inside the app's navigation.
 */
export function SignedInShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me });
  // Set while logging out, so the 401 that follows doesn't redirect with a returnTo.
  const leaving = useRef(false);

  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  const needsName = me.data?.needsName === true;
  const wedding = me.data?.wedding;
  // No wedding yet, or an Admin who hasn't finished "Invite your family" (WED-10).
  const needsSetup =
    me.data !== undefined &&
    !needsName &&
    (!wedding || (wedding.setupStep !== 'done' && me.data.role === 'admin'));
  const redirecting = signedOut || needsName || needsSetup;

  useEffect(() => {
    if (leaving.current) return;
    const returnTo = encodeURIComponent(pathname);
    if (signedOut) router.replace(`/login?returnTo=${returnTo}`);
    else if (needsName) router.replace(`/login?step=name&returnTo=${returnTo}`);
    else if (needsSetup) router.replace('/setup');
  }, [signedOut, needsName, needsSetup, pathname, router]);

  if (me.data && !redirecting) {
    return (
      <AppShell me={me.data} onLeave={() => (leaving.current = true)}>
        {children}
      </AppShell>
    );
  }
  return (
    <main id="main" className="min-h-screen bg-ivory">
      <Container className="py-12">
        {me.isError && !signedOut ? (
          <div role="alert" className="max-w-lg">
            <p className="text-body">{me.error.message}</p>
            <Button className="mt-6" onClick={() => void me.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <p role="status" className="text-body text-muted">
            Loading your wedding…
          </p>
        )}
      </Container>
    </main>
  );
}
