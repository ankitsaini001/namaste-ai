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

/** Public homepage (System Design §9.1: a pre-built static page). Sections follow the UX brief §9. */
export default function HomePage() {
  return (
    <>
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
