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

export { Badge } from '@/components/ui/badge';
