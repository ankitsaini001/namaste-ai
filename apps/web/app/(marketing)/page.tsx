import { Hero } from '@/components/home/hero';
import { SiteHeader } from '@/components/home/site-header';

/** Public homepage (System Design §9.1: a pre-built static page). */
export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
      </main>
    </>
  );
}
