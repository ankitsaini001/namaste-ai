import { LIMITS } from '@mmm/shared';
import type { Metadata } from 'next';
import { getApiReadiness, type ApiReadiness } from '@/lib/api-health';
import { getPublicEnv, getServerEnv } from '@/lib/env';

// Checked on every request, so the status is always current.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'System status · Make My Marriage',
  robots: { index: false, follow: false },
};

const STATUS: Record<ApiReadiness['state'], { label: string; dot: string }> = {
  ready: { label: 'API ready', dot: 'bg-emerald-500' },
  not_ready: { label: 'API not ready', dot: 'bg-amber-500' },
  unreachable: { label: 'API unreachable', dot: 'bg-red-500' },
};

/** Developer check that the web app, the API and MongoDB are all working. Not linked anywhere. */
export default async function StatusPage() {
  const readiness = await getApiReadiness(getServerEnv().API_URL);
  const { NEXT_PUBLIC_API_URL } = getPublicEnv();
  const status = STATUS[readiness.state];

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-8 px-4 py-16">
      <header className="space-y-2">
        <p className="text-sm font-medium tracking-widest text-rose-700 uppercase">
          Make My Marriage
        </p>
        <h1 className="text-4xl font-semibold">System status</h1>
        <p className="text-stone-600">Checks the web app, the API and MongoDB.</p>
      </header>

      <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 font-medium">
          <span className={`size-2.5 rounded-full ${status.dot}`} aria-hidden="true" />
          {status.label}
        </p>
        {readiness.state !== 'ready' && (
          <p className="text-sm text-stone-600">
            {readiness.message}
            {readiness.state === 'not_ready' && ` (request ${readiness.requestId})`}
          </p>
        )}
        <p className="text-sm text-stone-600">
          Liveness:{' '}
          <a className="text-rose-700 underline" href={`${NEXT_PUBLIC_API_URL}/v1/health`}>
            {NEXT_PUBLIC_API_URL}/v1/health
          </a>
        </p>
        <p className="text-sm text-stone-600">
          From <code>@mmm/shared</code>: up to {LIMITS.guests.toLocaleString('en-IN')} guests per
          wedding.
        </p>
      </section>
    </main>
  );
}
