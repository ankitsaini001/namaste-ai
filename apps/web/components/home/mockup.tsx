import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A product-interface illustration. Screen readers get one short description instead of the
 * sample data inside it.
 */
export function Mockup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="img" aria-label={label} className={cn('select-none', className)}>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

/** Small status pill used inside mockups. */
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'attending' | 'pending' | 'countdown' | 'neutral' | 'dark';
}) {
  const tones = {
    attending: 'bg-green-tint text-green-ink',
    pending: 'bg-sand text-muted',
    countdown: 'bg-terracotta-tint text-terracotta-ink',
    neutral: 'border border-line bg-white text-muted',
    dark: 'bg-aubergine text-ivory',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
