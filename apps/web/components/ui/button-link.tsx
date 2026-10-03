import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'bg-aubergine text-ivory shadow-card hover:bg-aubergine-hover',
  secondary: 'border border-ink text-ink hover:bg-sand',
} as const;

const SIZES = {
  // 52px tall, as in the brief; never below the 44px tap target.
  default: 'h-13 px-7 text-base',
  compact: 'h-11 px-5 text-sm',
} as const;

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
};

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  size = 'default',
  className,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-medium whitespace-nowrap transition-colors active:scale-[0.99]',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
