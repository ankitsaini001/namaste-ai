import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Small uppercase label above a heading. */
export function Eyebrow({
  children,
  className,
  onDark = false,
}: {
  children: ReactNode;
  className?: string;
  onDark?: boolean;
}) {
  return (
    <p
      className={cn(
        'text-eyebrow font-semibold uppercase',
        onDark ? 'text-champagne' : 'text-champagne-ink',
        className,
      )}
    >
      {children}
    </p>
  );
}
