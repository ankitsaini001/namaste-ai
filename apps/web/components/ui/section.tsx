import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './container';

const TONES = {
  ivory: 'bg-ivory',
  sand: 'bg-sand',
  // The page's one dark section (privacy).
  aubergine: 'on-dark bg-aubergine text-ivory',
} as const;

type SectionProps = {
  children: ReactNode;
  id?: string;
  tone?: keyof typeof TONES;
  className?: string;
  labelledBy?: string;
};

/** A full-width page band with the brief's vertical rhythm (72px mobile, 128px desktop). */
export function Section({ children, id, tone = 'ivory', className, labelledBy }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('py-18 lg:py-32', TONES[tone], className)}
    >
      <Container>{children}</Container>
    </section>
  );
}
