import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { heading } from '@/components/ui/typography';
import { demo } from '@/content/home';

export function DemoBanner() {
  return (
    <section id="demo" aria-labelledby="demo-title" className="bg-sand py-18 lg:py-24">
      <Container>
        <div className="rounded-2xl border border-champagne bg-ivory px-6 py-12 text-center lg:px-16 lg:py-16">
          <h2 id="demo-title" className={heading.h3 + ' lg:text-[34px]'}>
            {demo.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-muted lg:text-body-lg">{demo.text}</p>
          <ButtonLink href={demo.cta.href} variant="secondary" className="mt-8">
            {demo.cta.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
