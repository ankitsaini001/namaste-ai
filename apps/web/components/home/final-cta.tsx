import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { heading } from '@/components/ui/typography';
import { finalCta } from '@/content/home';

export function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="relative overflow-hidden bg-sand">
      {/* A large thin champagne arch behind the text. */}
      <div
        aria-hidden="true"
        className="absolute top-10 left-1/2 h-full w-[320px] -translate-x-1/2 rounded-t-[160px] border border-b-0 border-champagne/70 sm:w-[500px] sm:rounded-t-[250px]"
      >
        <div className="absolute inset-4 bottom-0 rounded-t-[144px] border border-b-0 border-dashed border-champagne/40 sm:rounded-t-[234px]" />
      </div>
      <Container className="relative py-28 text-center lg:py-40">
        <h2 id="final-title" className={heading.h2}>
          {finalCta.title}
        </h2>
        <p className="mx-auto mt-5 max-w-md text-body text-muted lg:text-body-lg">
          {finalCta.text}
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href={finalCta.primary.href}>{finalCta.primary.label}</ButtonLink>
          <ButtonLink href={finalCta.secondary.href} variant="secondary" className="bg-ivory/60">
            {finalCta.secondary.label}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
