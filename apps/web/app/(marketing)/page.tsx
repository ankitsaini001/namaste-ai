import type { Metadata } from 'next';
import { DemoBanner } from '@/components/home/demo-banner';
import { Family } from '@/components/home/family';
import { Faq } from '@/components/home/faq';
import { Features } from '@/components/home/features';
import { FinalCta } from '@/components/home/final-cta';
import { GuestView } from '@/components/home/guest-view';
import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { Privacy } from '@/components/home/privacy';
import { Problem } from '@/components/home/problem';
import { SiteFooter } from '@/components/home/site-footer';
import { SiteHeader } from '@/components/home/site-header';
import { hero } from '@/content/home';

export const metadata: Metadata = {
  title: 'Make My Marriage · Wedding planning for Indian families',
  description: hero.lead,
  openGraph: {
    title: 'Make My Marriage',
    description: `${hero.title} ${hero.lead}`,
    siteName: 'Make My Marriage',
    locale: 'en_IN',
    type: 'website',
  },
};

/** Public homepage (System Design §9.1: a pre-built static page). Sections follow the UX brief §9. */
export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-aubergine focus:px-4 focus:py-3 focus:text-ivory"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Family />
        <GuestView />
        <DemoBanner />
        <Privacy />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
