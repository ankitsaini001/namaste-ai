import { Minus, Plus, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { ArchFrame } from '@/components/ui/arch-frame';
import { Section } from '@/components/ui/section';
import { guestView } from '@/content/home';
import { Mockup } from './mockup';
import { SectionHeading } from './section-heading';

/** "Simple enough for Nani": three phone screens a guest sees, in slim arch frames. */
export function GuestView() {
  return (
    <Section labelledBy="guests-title">
      <SectionHeading id="guests-title" eyebrow={guestView.eyebrow} title={guestView.title} />
      <p className="mx-auto mt-5 max-w-2xl text-center text-body text-muted lg:text-body-lg">
        {guestView.text}
      </p>
      <ul className="mx-auto mt-12 grid max-w-sm gap-12 md:max-w-none md:grid-cols-3 md:gap-6 lg:mt-16 lg:gap-10">
        <Phone
          caption="Their own ceremonies"
          label="A guest's invitation listing their three ceremonies"
        >
          <p className="text-center font-serif text-lg">Dear Rajesh Sharma,</p>
          <p className="mt-1 text-center text-xs text-muted">You&apos;re invited to</p>
          <ul className="mt-4 space-y-2">
            {[
              ['Haldi', '12 Feb · 10:00 AM'],
              ['Sangeet', '13 Feb · 7:00 PM'],
              ['Wedding', '14 Feb · 7:30 PM'],
            ].map(([name, when]) => (
              <li key={name} className="rounded-lg border border-line bg-ivory px-3 py-2.5">
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted">{when}</p>
              </li>
            ))}
          </ul>
        </Phone>

        <Phone
          caption="RSVP in a tap"
          label="RSVP screen with large Attending and Not attending buttons and a people counter"
        >
          <p className="text-center text-[10px] font-semibold tracking-[0.12em] text-champagne-ink uppercase">
            Sangeet · 13 Feb
          </p>
          <p className="mt-1 text-center font-serif text-lg">Will you attend?</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium">
            <span className="rounded-lg bg-aubergine py-3 text-center text-ivory">Attending</span>
            <span className="rounded-lg border border-line bg-ivory py-3 text-center text-muted">
              Not attending
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-ivory px-3 py-2.5">
            <span className="text-sm">Number of people</span>
            <span className="flex items-center gap-3">
              <Minus className="size-4 text-muted" strokeWidth={1.5} />
              <span className="font-semibold tabular-nums">3</span>
              <Plus className="size-4 text-muted" strokeWidth={1.5} />
            </span>
          </div>
        </Phone>

        <Phone
          caption="Photos in seconds"
          label="Photo upload finished: Thank you, Neha! 23 photos added to Sangeet"
        >
          <span className="mx-auto flex size-10 items-center justify-center rounded-full border border-champagne text-champagne-ink">
            <Upload className="size-4" strokeWidth={1.5} />
          </span>
          <p className="mt-3 text-center font-serif text-lg">Add your photos</p>
          <div className="mt-4 h-2 rounded-full bg-sand">
            <div className="h-full w-full rounded-full bg-aubergine" />
          </div>
          <div className="mt-4 rounded-lg bg-green-tint px-3 py-3 text-green-ink">
            <p className="text-sm font-medium">Thank you, Neha!</p>
            <p className="mt-0.5 text-xs">23 photos added to Sangeet.</p>
          </div>
        </Phone>
      </ul>
    </Section>
  );
}

function Phone({
  caption,
  label,
  children,
}: {
  caption: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-col items-center">
      <Mockup label={label} className="w-full max-w-[300px] pr-3 pb-3">
        <ArchFrame>
          <div className="flex min-h-[340px] flex-col justify-center px-5 pt-[22cqw] pb-6">
            {children}
          </div>
        </ArchFrame>
      </Mockup>
      <p className="mt-5 text-sm font-medium text-muted">{caption}</p>
    </li>
  );
}
