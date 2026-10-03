import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Centres content at the 1200px max width with the page gutters. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-5 md:px-8 lg:px-10', className)}>
      {children}
    </div>
  );
}
