import { Section } from '@/components/ui/section';
import { heading } from '@/components/ui/typography';
import { howItWorks } from '@/content/home';
import { SectionHeading } from './section-heading';

/** Three steps: a row joined by a thin champagne line on desktop, a vertical timeline on mobile. */
export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-title">
      <SectionHeading id="how-title" eyebrow={howItWorks.eyebrow} title={howItWorks.title} />
      <ol className="relative mx-auto mt-12 max-w-xl lg:mt-20 lg:grid lg:max-w-none lg:grid-cols-3 lg:gap-10">
        {/* Desktop: one horizontal line through the numerals. */}
        <span
          aria-hidden="true"
          className="absolute top-10 right-[16.66%] left-[16.66%] hidden h-px bg-champagne lg:block"
        />
        {howItWorks.steps.map((step, index) => (
          <li
            key={step.title}
            className="relative flex gap-6 pb-10 last:pb-0 lg:flex-col lg:items-center lg:pb-0 lg:text-center"
          >
            {/* Mobile: a vertical segment from this numeral down to the next one. */}
            {index < howItWorks.steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-16 bottom-0 left-8 w-px bg-champagne lg:hidden"
              />
            )}
            <span
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-full border border-champagne bg-ivory font-serif text-2xl text-aubergine tabular-nums lg:size-20 lg:text-3xl"
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="pt-3 lg:pt-0">
              <h3 className={heading.h3}>
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-3 text-body text-muted lg:mx-auto lg:max-w-xs">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
