import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const TONES = {
  attending: 'bg-green-tint text-green-ink',
  pending: 'bg-sand text-muted',
  countdown: 'bg-terracotta-tint text-terracotta-ink',
  neutral: 'border border-line bg-white text-muted',
  dark: 'bg-aubergine text-ivory',
} as const;

export type BadgeTone = keyof typeof TONES;

/** Pill-shaped status badge with a soft tinted background (UX brief §6). */
export function Badge({ children, tone }: { children: ReactNode; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
