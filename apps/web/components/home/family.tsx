import { Card } from '@/components/ui/card';
import { Section } from '@/components/ui/section';
import { heading } from '@/components/ui/typography';
import { family } from '@/content/home';
import { FramedIcon } from './icons';
import { SectionHeading } from './section-heading';

export function Family() {
  return (
    <Section tone="sand" labelledBy="family-title">
      <SectionHeading id="family-title" eyebrow={family.eyebrow} title={family.title} />
      <ul className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16 lg:gap-8">
        {family.columns.map((column) => (
          <li key={column.title}>
            <Card className="h-full text-center">
              <FramedIcon icon={column.icon} shape="round" />
              <h3 className={`${heading.h3} mt-6`}>{column.title}</h3>
              <p className="mx-auto mt-3 max-w-xs text-body text-muted">{column.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}
