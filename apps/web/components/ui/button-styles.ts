import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'bg-aubergine text-ivory shadow-card hover:bg-aubergine-hover',
  secondary: 'border border-ink text-ink hover:bg-sand',
  ghost: 'text-ink hover:bg-sand',
} as const;

const SIZES = {
  // 52px tall, as in the brief; never below the 44px tap target.
  default: 'h-13 px-7 text-base',
  compact: 'h-11 px-5 text-sm',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

/** Shared look for buttons and button-styled links. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
