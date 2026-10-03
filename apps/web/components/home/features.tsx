import { CheckList } from '@/components/ui/check-list';
import { Container } from '@/components/ui/container';
import { Eyebrow } from '@/components/ui/eyebrow';
import { heading } from '@/components/ui/typography';
import { features } from '@/content/home';
import { cn } from '@/lib/cn';
import { FeatureMockupView } from './feature-mockups';

/** Six alternating rows: text and an arch-framed mockup, on alternating ivory and sand. */
export function Features() {
  return (
    <div id="features">
      <h2 className="sr-only">Features</h2>
      {features.rows.map((row, index) => {
        const flipped = index % 2 === 1;
        return (
          <section
            key={row.mockup}
            aria-labelledby={`feature-${row.mockup}`}
            className={cn('py-18 lg:py-28', flipped ? 'bg-sand' : 'bg-ivory')}
          >
            <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
              <div className={cn(flipped && 'lg:order-last')}>
                <Eyebrow>{row.eyebrow}</Eyebrow>
                <h3 id={`feature-${row.mockup}`} className={`${heading.h3} mt-4 lg:text-[34px]`}>
                  {row.title}
                </h3>
                <p className="mt-4 max-w-lg text-body text-muted lg:text-body-lg">{row.text}</p>
                <div className="mt-6">
                  <CheckList items={row.points} />
                </div>
              </div>
              <FeatureMockupView kind={row.mockup} />
            </Container>
          </section>
        );
      })}
    </div>
  );
}
