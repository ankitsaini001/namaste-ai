import { Hero } from '@/components/home/hero';
import { HowItWorks } from '@/components/home/how-it-works';
import { Problem } from '@/components/home/problem';
import { SiteHeader } from '@/components/home/site-header';

/** Public homepage (System Design §9.1: a pre-built static page). */
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
      </main>
    </>
  );
}
