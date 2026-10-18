import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** An on/off switch: a real checkbox for assistive tech, with the whole row as its label. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn('flex min-h-11 cursor-pointer items-center justify-between gap-4', className)}
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-aubergine peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-aubergine"
        />
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-card transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
