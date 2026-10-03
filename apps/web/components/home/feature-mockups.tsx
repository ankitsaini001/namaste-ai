import { CirclePlay, MapPin, QrCode, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArchFrame } from '@/components/ui/arch-frame';
import type { FeatureMockup } from '@/content/home';
import { Badge, Mockup } from './mockup';

/** Sample-data illustrations for the feature rows. Data follows the PRD's real fields. */
export function FeatureMockupView({ kind }: { kind: FeatureMockup }) {
  const { label, body, centredTop } = MOCKUPS[kind];
  return (
    <Mockup label={label} className="mx-auto w-full max-w-[460px] pr-3 pb-3">
      <ArchFrame>
        {/* Full-width content must start ~27% of the arch's width down, or the curve clips it. */}
        <div className={`px-5 pb-6 sm:px-7 ${centredTop ? 'pt-[16cqw]' : 'pt-[27cqw]'}`}>
          {body}
        </div>
      </ArchFrame>
    </Mockup>
  );
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-ivory p-3.5 ${className}`}>{children}</div>
  );
}

function Title({ children, meta }: { children: ReactNode; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="font-serif text-lg">{children}</p>
      {meta && <p className="text-xs text-muted">{meta}</p>}
    </div>
  );
}

// Task statuses are the PRD's: To do, In progress, Completed.
const TASK_TONE = { 'To do': 'neutral', 'In progress': 'pending', Completed: 'dark' } as const;

const TASKS: { title: string; meta: string; status: keyof typeof TASK_TONE }[] = [
  { title: 'Book mehendi artist', meta: "Diya's mother · due 20 Dec", status: 'In progress' },
  { title: 'Order safas', meta: 'Aarav · done 2 Dec', status: 'Completed' },
  { title: 'Sweets tasting', meta: 'Chachi · due 28 Dec', status: 'To do' },
];

const MOCKUPS: Record<FeatureMockup, { label: string; body: ReactNode; centredTop?: boolean }> = {
  guests: {
    label:
      'Guest list with each guest invited to their own ceremonies, and a headcount per ceremony',
    body: (
      <>
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-line bg-white p-3 text-center">
          {[
            ['Haldi', '85'],
            ['Sangeet', '180'],
            ['Wedding', '240'],
            ['Reception', '220'],
          ].map(([name, count]) => (
            <div key={name}>
              <p className="text-[10px] text-muted">{name}</p>
              <p className="mt-0.5 font-serif text-lg tabular-nums">{count}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {[
            { name: 'Rajesh Sharma', people: 4, events: ['Haldi', 'Sangeet', 'Wedding'], ok: true },
            { name: 'Anita Verma', people: 3, events: ['Sangeet', 'Wedding'], ok: true },
            { name: 'Vikram Mehta', people: 2, events: ['Wedding', 'Reception'], ok: false },
          ].map((guest) => (
            <Panel key={guest.name}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {guest.name}{' '}
                  <span className="font-normal text-muted">· {guest.people} people</span>
                </p>
                <Badge tone={guest.ok ? 'attending' : 'pending'}>
                  {guest.ok ? 'Attending' : 'Pending'}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {guest.events.map((event) => (
                  <Badge key={event} tone="neutral">
                    {event}
                  </Badge>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </>
    ),
  },

  invitation: {
    centredTop: true,
    label: 'A personal digital invitation card for Rajesh Sharma with a Share on WhatsApp button',
    body: (
      <>
        <div className="@container mx-auto max-w-[280px]">
          <div className="rounded-t-[50cqw] rounded-b-xl bg-aubergine px-6 pt-[22cqw] pb-7 text-center text-ivory">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full border border-champagne font-serif text-sm text-champagne italic">
              M
            </span>
            <p className="mt-3 text-[10px] font-semibold tracking-[0.14em] text-champagne uppercase">
              Invitation
            </p>
            <p className="mt-2 font-serif text-2xl">Aarav &amp; Diya</p>
            <span className="mx-auto mt-3 block h-px w-10 bg-champagne" />
            <p className="mt-3 text-xs text-ivory/80">request the pleasure of your company</p>
            <p className="mt-1 text-sm font-medium">Rajesh Sharma</p>
            <p className="mt-2 text-[11px] text-ivory/70">Jaipur · 12–14 February 2027</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line bg-ivory py-3 text-sm font-medium">
          <Share2 className="size-4" strokeWidth={1.5} />
          Share on WhatsApp
        </div>
      </>
    ),
  },

  website: {
    centredTop: true,
    label: "Aarav and Diya's wedding website with ceremonies, a venue map link and a live stream",
    body: (
      <>
        <div className="text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-champagne font-serif text-sm italic">
            A&amp;D
          </span>
          <p className="mt-3 text-[10px] font-semibold tracking-[0.14em] text-champagne-ink uppercase">
            The wedding of
          </p>
          <p className="mt-1 font-serif text-2xl">Aarav &amp; Diya</p>
          <p className="mt-1 text-xs text-muted">14 February 2027 · Jaipur</p>
        </div>
        <div className="mt-5 space-y-2">
          <Panel>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">Sangeet</p>
                <p className="text-xs text-muted">13 Feb · 7:00 PM · Rambagh Lawns</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-champagne-ink">
                <MapPin className="size-3.5" strokeWidth={1.5} /> Map
              </span>
            </div>
          </Panel>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-aubergine p-3.5 text-ivory">
            <div>
              <p className="text-sm font-medium">Wedding</p>
              <p className="text-xs text-ivory/75">14 Feb · Watch live on YouTube</p>
            </div>
            <CirclePlay className="size-6 text-champagne" strokeWidth={1.5} />
          </div>
        </div>
      </>
    ),
  },

  budget: {
    label: 'Budget screen showing budget, committed, paid and due amounts, with upcoming payments',
    body: (
      <>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['Budget', '₹28,00,000', 'text-ink'],
            ['Committed', '₹24,50,000', 'text-ink'],
            ['Paid', '₹14,60,000', 'text-ink'],
            ['Due', '₹9,90,000', 'text-terracotta-ink'],
          ].map(([name, amount, color]) => (
            <Panel key={name}>
              <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{name}</p>
              <p className={`mt-1 text-base font-semibold tabular-nums ${color}`}>{amount}</p>
            </Panel>
          ))}
        </div>
        <p className="mt-4 text-[10px] font-semibold tracking-wide text-muted uppercase">
          Upcoming payments
        </p>
        <div className="mt-2 space-y-2">
          {[
            ['Shree Caterers', 'Due 5 Jan', '₹2,00,000'],
            ['Royal Jaipur Sound', 'Due 15 Jan', '₹1,50,000'],
          ].map(([vendor, due, amount]) => (
            <Panel key={vendor} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{vendor}</p>
                <p className="text-xs text-muted">{due}</p>
              </div>
              <p className="text-sm font-semibold tabular-nums">{amount}</p>
            </Panel>
          ))}
        </div>
      </>
    ),
  },

  gallery: {
    label: 'Sangeet photo album with 312 photos beside a QR code card for guest uploads',
    body: (
      <div className="grid grid-cols-[1.4fr_1fr] gap-3">
        <Panel>
          <Title meta="312 photos">Sangeet</Title>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {['#E8DCCB', '#F6E3C3', '#EADBEF', '#DCDAD5', '#F1EBE2', '#E9D7C1'].map((color) => (
              <div key={color} className="aspect-square rounded-md" style={{ background: color }} />
            ))}
          </div>
        </Panel>
        <div className="flex flex-col items-center justify-center rounded-xl border border-champagne bg-white p-3 text-center">
          <QrCode className="size-12 text-aubergine" strokeWidth={1.25} />
          <p className="mt-2 text-[10px] font-semibold tracking-wide text-champagne-ink uppercase">
            Scan to share
          </p>
          <p className="mt-1 text-[10px] text-muted">Your photos, straight to the album</p>
        </div>
      </div>
    ),
  },

  tasks: {
    label: 'Shared family task list with assignees, due dates and statuses',
    body: (
      <>
        <Title meta="8 open">Family tasks</Title>
        <div className="mt-3 space-y-2">
          {TASKS.map((task) => (
            <Panel key={task.title} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{task.title}</p>
                <p className="text-xs text-muted">{task.meta}</p>
              </div>
              <Badge tone={TASK_TONE[task.status]}>{task.status}</Badge>
            </Panel>
          ))}
        </div>
      </>
    ),
  },
};
