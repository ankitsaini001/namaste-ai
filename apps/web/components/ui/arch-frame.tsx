import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * The signature jharokha arch: a frame with a semicircular top and a thin champagne outline
 * offset behind it. The radius uses container-query units so the top is always a true
 * semicircle, whatever the frame's width.
 */
export function ArchFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('@container relative', className)}>
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-3 translate-y-3 rounded-t-[50cqw] rounded-b-2xl border border-champagne"
      />
      <div className="relative overflow-hidden rounded-t-[50cqw] rounded-b-2xl border border-line bg-white shadow-card">
        {children}
      </div>
    </div>
  );
}
