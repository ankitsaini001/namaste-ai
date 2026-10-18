'use client';

import { LIMITS, type WeddingEvent } from '@mmm/shared';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { ChangeLine } from '@/components/ui/change-line';
import { Container } from '@/components/ui/container';
import { heading } from '@/components/ui/typography';
import { eventsQueryKey, weddingApi } from '@/lib/wedding-api';
import { formatCeremonyWhen } from '@/lib/wedding-format';

/** EVT-01, EVT-03: every ceremony, by date and time. */
export function CeremoniesPage() {
  const events = useQuery({ queryKey: eventsQueryKey, queryFn: weddingApi.events });
  const count = events.data?.length ?? 0;

  return (
    <Container className="max-w-4xl py-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className={heading.h2}>Ceremonies</h1>
        {events.data && count < LIMITS.events && (
          <ButtonLink href="/app/ceremonies/new" size="compact">
            <Plus aria-hidden="true" className="size-4" />
            Add ceremony
          </ButtonLink>
        )}
      </div>
      <p className="mt-3 max-w-2xl text-body text-muted">
        Every ceremony, in date and time order. A private ceremony is seen only by the guests
        invited to it.
      </p>

      {events.isPending ? (
        <p role="status" className="mt-8 text-body text-muted">
          Loading ceremonies…
        </p>
      ) : events.isError ? (
        <div role="alert" className="mt-8">
          <p className="text-body">{events.error.message}</p>
          <Button className="mt-4" onClick={() => void events.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {count} of {LIMITS.events}
            {count >= LIMITS.events && ': that’s the most a wedding can have.'}
          </p>
          <ol className="mt-3 space-y-4">
            {events.data.map((event) => (
              <CeremonyCard key={event.id} event={event} />
            ))}
          </ol>
        </>
      )}
    </Container>
  );
}

function CeremonyCard({ event }: { event: WeddingEvent }) {
  const ended = Date.parse(event.endsAt ?? event.startsAt) < Date.now();
  const where = [event.venueName, event.address].filter(Boolean).join(' · ');
  return (
    <li className="relative rounded-2xl border border-line bg-white p-5 shadow-card transition-colors hover:border-champagne sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-serif text-xl text-ink">
          {/* The whole card opens the ceremony; the name is the link's text. */}
          <Link
            href={`/app/ceremonies/${event.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-aubergine"
          >
            {event.name}
          </Link>
        </h2>
        {!event.showOnWebsite && <Badge tone="pending">Private</Badge>}
        {event.livestreamUrl && <Badge tone="neutral">Live stream</Badge>}
        {ended && <Badge tone="neutral">Done</Badge>}
      </div>
      <p className="mt-2 text-[15px] text-ink">
        {formatCeremonyWhen(event.startsAt, event.endsAt)}
      </p>
      {where && <p className="mt-1 text-sm text-muted">{where}</p>}
      {event.dressCode && <p className="mt-1 text-sm text-muted">Dress code: {event.dressCode}</p>}
      <ChangeLine added={event.added} lastChanged={event.lastChanged} className="mt-3" />
    </li>
  );
}
