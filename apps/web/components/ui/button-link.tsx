import Link from 'next/link';
import type { ReactNode } from 'react';
import { type ButtonSize, type ButtonVariant, buttonClass } from './button-styles';

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
