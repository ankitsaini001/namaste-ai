'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { Logo } from '@/components/ui/logo';
import { heading } from '@/components/ui/typography';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';

export function AppHome() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me });

  const signedOut = me.error instanceof ApiError && me.error.status === 401;
  const needsName = me.data?.needsName === true;
  // Set while logging out, so the 401 that follows doesn't redirect with ?returnTo=/app.
  const leaving = useRef(false);

  useEffect(() => {
    if (leaving.current) return;
    if (signedOut) router.replace('/login?returnTo=/app');
    else if (needsName) router.replace('/login?step=name&returnTo=/app');
  }, [signedOut, needsName, router]);

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      leaving.current = true;
      router.replace('/login');
      queryClient.clear();
    },
  });

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-line bg-ivory">
        <Container className="flex h-18 items-center justify-between">
          <Logo />
          {me.data && !needsName && (
            <Button
              variant="ghost"
              size="compact"
              loading={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Log out
            </Button>
          )}
        </Container>
      </header>

      <main id="main">
        <Container className="py-16 lg:py-24">
          {me.isPending || signedOut || needsName ? (
            <p role="status" className="text-body text-muted">
              Loading your account…
            </p>
          ) : me.isError ? (
            <div role="alert" className="max-w-lg">
              <p className="text-body">{me.error.message}</p>
              <Button className="mt-6" onClick={() => void me.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="max-w-2xl">
              <Eyebrow>Your wedding</Eyebrow>
              <h1 className={`${heading.h1} mt-4`}>
                Welcome, {me.data.user.name?.split(' ')[0] ?? 'there'}.
              </h1>
              <p className="mt-4 text-body text-muted lg:text-body-lg">
                You&apos;re signed in as {me.data.user.email}.
              </p>
              <section
                aria-labelledby="next-step"
                className="mt-10 rounded-2xl border border-line bg-white p-6 shadow-card lg:p-8"
              >
                <h2 id="next-step" className={heading.h3}>
                  Setting up your wedding is coming soon
                </h2>
                <p className="mt-3 text-body text-muted">
                  You&apos;ll add the couple&apos;s names, the date and your ceremonies here, then
                  invite your family to plan with you.
                </p>
              </section>
              {logout.isError && (
                <p role="alert" className="mt-6 text-sm text-terracotta-ink">
                  {logout.error.message}
                </p>
              )}
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
