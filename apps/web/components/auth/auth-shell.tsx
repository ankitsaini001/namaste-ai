import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/logo';
import { ROUTES } from '@/lib/routes';
import { Badge } from '@/components/ui/badge';

/**
 * Login layout (UX brief §12): the form on ivory; on large screens, the aubergine panel with the
 * jaali pattern and an arch-framed glimpse of the dashboard.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-2">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <main id="main" className="relative flex flex-1 items-center justify-center py-12">
          {/* Mobile: a faint arch outline behind the heading. */}
          <div
            aria-hidden="true"
            className="absolute top-6 left-1/2 h-72 w-64 -translate-x-1/2 rounded-t-[128px] border border-b-0 border-champagne/30 lg:hidden"
          />
          <div className="relative w-full max-w-[400px]">{children}</div>
        </main>
        <p className="text-center text-[13px] text-muted">
          By continuing, you agree to our{' '}
          <Link href={ROUTES.terms} className="underline underline-offset-2 hover:text-ink">
            Terms
          </Link>{' '}
          and{' '}
          <Link href={ROUTES.privacy} className="underline underline-offset-2 hover:text-ink">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <aside
        aria-hidden="true"
        className="bg-jaali-light hidden flex-col items-center justify-center gap-10 bg-aubergine px-10 lg:flex"
      >
        <div className="@container relative w-full max-w-[360px]">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-t-[50cqw] rounded-b-2xl border border-champagne/60" />
          <div className="relative rounded-t-[50cqw] rounded-b-2xl bg-ivory px-6 pt-[24cqw] pb-6">
            <p className="text-center font-serif text-2xl text-ink">Aarav &amp; Diya</p>
            <p className="mt-1 text-center text-xs text-muted">14 February 2027 · Jaipur</p>
            <div className="mt-3 text-center">
              <Badge tone="countdown">42 days to go</Badge>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                  Guests
                </p>
                <p className="mt-1 font-serif text-xl tabular-nums">240</p>
                <p className="text-[11px] text-muted">168 responded</p>
              </div>
              <div className="rounded-xl border border-line bg-white p-3">
                <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                  Sangeet
                </p>
                <p className="mt-1 font-serif text-xl tabular-nums">180</p>
                <p className="text-[11px] text-muted">attending</p>
              </div>
            </div>
          </div>
        </div>
        <p className="font-serif text-3xl text-ivory">The calm behind the celebration.</p>
      </aside>
    </div>
  );
}
