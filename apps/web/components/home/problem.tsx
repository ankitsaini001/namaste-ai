import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { heading } from '@/components/ui/typography';
import { problem } from '@/content/home';
import { FramedIcon } from './icons';
import { SectionHeading } from './section-heading';

export function Problem() {
  return (
    <Section tone="sand" labelledBy="problem-title">
      <SectionHeading id="problem-title" eyebrow={problem.eyebrow} title={problem.title} />
      <ul className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16 lg:gap-8">
        {problem.cards.map((card) => (
          <li key={card.title}>
            <Card className="h-full">
              <FramedIcon icon={card.icon} />
              <h3 className={`${heading.h3} mt-6`}>{card.title}</h3>
              <p className="mt-3 text-body text-muted">{card.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}
