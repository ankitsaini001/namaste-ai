import type { ReactNode } from 'react';
import { ArchFrame } from '@/components/ui/arch-frame';
import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { heading } from '@/components/ui/typography';
import { hero } from '@/content/home';
import { Badge, Mockup } from './mockup';

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="bg-jaali overflow-hidden bg-ivory">
      <Container className="grid items-center gap-16 pt-12 pb-20 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:pt-24 lg:pb-32">
        <div className="text-center lg:text-left">
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 id="hero-title" className={`${heading.h1} mt-5`}>
            {hero.title}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-body text-muted lg:mx-0 lg:text-body-lg">
            {hero.lead}
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href={hero.primary.href}>{hero.primary.label}</ButtonLink>
            <ButtonLink href={hero.secondary.href} variant="secondary">
              {hero.secondary.label}
            </ButtonLink>
          </div>
          <ul className="mt-7 flex flex-col items-center gap-1 text-sm text-muted sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-3 lg:justify-start">
            {hero.trust.map((item, index) => (
              <li key={item} className="flex items-center gap-3">
                {index > 0 && (
                  <span aria-hidden="true" className="hidden sm:inline">
                    ·
                  </span>
                )}
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroMockup />
      </Container>
    </section>
  );
}

const CEREMONIES = ['Mehendi', 'Haldi', 'Sangeet', 'Wedding', 'Reception'];

function HeroMockup() {
  return (
    <Mockup
      label="Preview of the Make My Marriage dashboard for Aarav and Diya's wedding, with a guest's invitation on a phone"
      className="relative mx-auto w-full max-w-[540px] pb-44 sm:pb-10 lg:pr-4"
    >
      <ArchFrame>
        <div className="px-5 pt-[15cqw] pb-6 sm:px-7">
          <div className="text-center">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-champagne-ink uppercase">
              Wedding celebration
            </p>
            <p className="mt-2 font-serif text-[26px] leading-tight sm:text-[30px]">
              Aarav &amp; Diya
            </p>
            <p className="mt-1 text-xs text-muted">14 February 2027 · Jaipur</p>
            <div className="mt-3">
              <Badge tone="countdown">42 days to go</Badge>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-ivory p-4">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold tracking-wide text-muted uppercase">5 ceremonies</span>
              <span className="font-medium">Next: Mehendi, 12 Feb</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {CEREMONIES.map((name, index) => (
                <Badge key={name} tone={index === 0 ? 'dark' : 'neutral'}>
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-left">
            <StatCard label="Guests" value="168" suffix="/ 240 responded">
              <div className="mt-3 h-1.5 rounded-full bg-sand">
                <div className="h-full w-[70%] rounded-full bg-aubergine" />
              </div>
            </StatCard>
            <StatCard label="Sangeet" value="180" suffix="attending" />
            {/* Gallery sits bottom-left, where the phone card overlaps it. */}
            <StatCard label="Gallery" value="1,240" suffix="photos" small="from 58 guests" />
            <StatCard label="Budget" value="₹28,00,000" small="Paid ₹14,60,000" />
          </div>
        </div>
      </ArchFrame>

      <div className="absolute bottom-0 left-0 w-[58%] max-w-[250px] rounded-2xl border border-line bg-white p-4 shadow-float sm:-left-6">
        <div className="mx-auto mb-3 h-1 w-8 rounded-full bg-line" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-champagne-ink uppercase">
            Invitation
          </p>
          <Badge tone="attending">Attending</Badge>
        </div>
        <p className="mt-2 font-serif text-base">Dear Rajesh Sharma,</p>
        <p className="mt-1 text-[11px] text-muted">You&apos;re invited to 3 ceremonies</p>
        <ul className="mt-3 space-y-1.5 text-[11px]">
          {['Mehendi · 12 Feb', 'Sangeet · 13 Feb', 'Wedding · 14 Feb'].map((item) => (
            <li key={item} className="flex items-center gap-2 rounded-md bg-ivory px-2.5 py-1.5">
              <span className="size-1.5 rounded-full bg-champagne" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Mockup>
  );
}

function StatCard({
  label,
  value,
  suffix,
  small,
  children,
}: {
  label: string;
  value: string;
  suffix?: string;
  small?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3.5">
      <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1.5 font-serif text-xl leading-none tabular-nums sm:text-2xl">
        {value}
        {suffix && <span className="ml-1 font-sans text-[11px] text-muted">{suffix}</span>}
      </p>
      {small && <p className="mt-1.5 text-[11px] text-muted">{small}</p>}
      {children}
    </div>
  );
}
