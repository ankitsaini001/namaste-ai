'use client';

import type { Wedding, WeddingEvent } from '@mmm/shared';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { heading } from '@/components/ui/typography';
import { cn } from '@/lib/cn';
import { organisersApi, organisersQueryKey } from '@/lib/organisers-api';
import { eventsQueryKey, weddingApi, weddingQueryKey } from '@/lib/wedding-api';
import { countdown, formatCeremonyTime, formatWeddingDate } from '@/lib/wedding-format';

/** The first version of the dashboard: welcome, getting ready and ceremonies (DASH-01, 03, 06). */
export function Overview() {
  const wedding = useQuery({ queryKey: weddingQueryKey, queryFn: weddingApi.get });
  const events = useQuery({ queryKey: eventsQueryKey, queryFn: weddingApi.events });
  const organisers = useQuery({ queryKey: organisersQueryKey, queryFn: organisersApi.list });
  const queries = [wedding, events, organisers];

  if (queries.some((query) => query.isPending)) {
    return (
      <Page>
        <p role="status" className="text-body text-muted">
          Loading your wedding…
        </p>
      </Page>
    );
  }
  const error = queries.find((query) => query.error)?.error;
  if (error) {
    return (
      <Page>
        <div role="alert" className="max-w-lg">
          <p className="text-body">{error.message}</p>
          <Button className="mt-6" onClick={() => queries.forEach((query) => void query.refetch())}>
            Try again
          </Button>
        </div>
      </Page>
    );
  }

  const team = organisers.data!;
  return (
    <Page>
      <div className="space-y-6">
        <WelcomeCard wedding={wedding.data!} />
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <GettingReady
            ceremonies={events.data!.length}
            invitedFamily={team.organisers.length > 1 || team.invites.length > 0}
            className="lg:col-span-2"
          />
          <Ceremonies events={events.data!} />
        </div>
      </div>
    </Page>
  );
}

const Page = ({ children }: { children: ReactNode }) => (
  <Container className="py-8 lg:py-10">{children}</Container>
);

function WelcomeCard({ wedding }: { wedding: Wedding }) {
  const when = countdown(wedding.date);
  return (
    <section
      aria-labelledby="wedding-title"
      className="on-dark bg-jaali-light relative overflow-hidden rounded-2xl bg-aubergine px-6 py-8 text-ivory sm:px-10 sm:py-10"
    >
      {/* A large thin champagne arch on the right (decoration only). */}
      <div
        aria-hidden="true"
        className="absolute -right-10 -bottom-24 hidden h-80 w-72 rounded-t-[144px] border border-b-0 border-champagne/40 md:block"
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow onDark>Your wedding</Eyebrow>
          <h1 id="wedding-title" className={`${heading.h2} mt-3 text-ivory`}>
            {wedding.title}
          </h1>
          <p className="mt-3 text-body text-ivory/80">
            {formatWeddingDate(wedding.date)} · {wedding.city}
          </p>
        </div>
        <p className="md:mr-24 md:text-right">
          {when.state === 'upcoming' ? (
            <>
              <span className="block font-serif text-6xl leading-none text-champagne tabular-nums">
                {when.days}
              </span>
              <span className="mt-1 block text-sm text-ivory/80">
                {when.days === 1 ? 'day to go' : 'days to go'}
              </span>
            </>
          ) : (
            <span className="font-serif text-3xl text-champagne">{when.label}</span>
          )}
        </p>
      </div>
    </section>
  );
}

/** DASH-03. A step with a link can be done now; the others arrive with their features. */
const READY_STEPS: readonly { label: string; href?: string }[] = [
  { label: 'Add ceremonies' },
  { label: 'Invite your family', href: '/app/organisers' },
  { label: 'Add guests' },
  { label: 'Send invitations' },
  { label: 'Publish your website' },
  { label: 'Print your photo QR code' },
];

function GettingReady({
  ceremonies,
  invitedFamily,
  className,
}: {
  ceremonies: number;
  invitedFamily: boolean;
  className?: string;
}) {
  const done = [ceremonies > 0, invitedFamily, false, false, false, false];
  const count = done.filter(Boolean).length;
  if (count === READY_STEPS.length) return null;

  return (
    <section
      aria-labelledby="getting-ready"
      className={cn('rounded-2xl border border-line bg-white p-6 shadow-card', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="getting-ready" className={heading.h3}>
          Getting ready · {count} of {READY_STEPS.length} done
        </h2>
        <span className="text-sm text-muted tabular-nums">
          {Math.round((count / READY_STEPS.length) * 100)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Getting ready"
        aria-valuemin={0}
        aria-valuemax={READY_STEPS.length}
        aria-valuenow={count}
        className="mt-4 h-1.5 rounded-full bg-sand"
      >
        <div
          className="h-full rounded-full bg-champagne"
          style={{ width: `${(count / READY_STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2">
        {READY_STEPS.map((step, index) => (
          <li
            key={step.label}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              done[index] ? 'border-line bg-ivory' : 'border-line bg-white',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done[index] ? 'bg-aubergine text-ivory' : 'border border-line text-muted',
              )}
            >
              {done[index] ? <Check className="size-4" strokeWidth={2} /> : index + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-ink">{step.label}</span>
            {done[index] ? (
              <span className="text-xs font-medium text-green-ink">Done</span>
            ) : step.href ? (
              <Link
                href={step.href}
                className="inline-flex min-h-11 items-center text-sm font-medium text-aubergine underline underline-offset-4"
              >
                Start
                <span className="sr-only">: {step.label}</span>
              </Link>
            ) : (
              <Badge tone="pending">Coming soon</Badge>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** DASH-06: ceremonies by date and time (IST), with Private and Live stream badges. */
function Ceremonies({ events }: { events: WeddingEvent[] }) {
  const now = Date.now();
  const upcoming = events.filter((event) => Date.parse(event.startsAt) >= now);
  const past = events.length - upcoming.length;

  return (
    <section
      aria-labelledby="ceremonies"
      className="rounded-2xl border border-line bg-white p-6 shadow-card"
    >
      <h2 id="ceremonies" className={heading.h3}>
        Upcoming ceremonies
      </h2>
      {upcoming.length === 0 ? (
        <p className="mt-4 text-body text-muted">
          {events.length === 0 ? 'No ceremonies yet.' : 'All your ceremonies have taken place.'}
        </p>
      ) : (
        <ol className="relative mt-6 space-y-6">
          <span
            aria-hidden="true"
            className="absolute top-2 bottom-2 left-[5px] w-px bg-champagne/70"
          />
          {upcoming.map((event, index) => {
            const { date, time } = formatCeremonyTime(event.startsAt);
            return (
              <li key={event.id} className="relative flex gap-4">
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative mt-1.5 size-[11px] shrink-0 rounded-full border-2',
                    index === 0 ? 'border-aubergine bg-aubergine' : 'border-champagne bg-white',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-lg text-ink">{event.name}</h3>
                    {!event.showOnWebsite && <Badge tone="pending">Private</Badge>}
                    {event.livestreamUrl && <Badge tone="neutral">Live stream</Badge>}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {date} · {time}
                    {event.venueName && ` · ${event.venueName}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {past > 0 && upcoming.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          {past} earlier {past === 1 ? 'ceremony has' : 'ceremonies have'} taken place.
        </p>
      )}
    </section>
  );
}
