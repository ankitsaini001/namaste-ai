import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/cn';

/** The "M" monogram inside a thin champagne arch, beside the Fraunces wordmark. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.home}
      aria-label="Make My Marriage, home"
      className={cn('inline-flex items-center gap-3 rounded-md', className)}
    >
      <svg aria-hidden="true" viewBox="0 0 34 40" className="h-10 w-[34px] shrink-0">
        <path
          d="M2 39V17C2 8.7 8.7 2 17 2s15 6.7 15 15v22"
          fill="none"
          stroke="var(--color-champagne)"
          strokeWidth="1.5"
        />
        <text
          x="17"
          y="28"
          textAnchor="middle"
          fontSize="17"
          fontStyle="italic"
          fill="var(--color-aubergine)"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          M
        </text>
      </svg>
      <span className="font-serif text-xl leading-none font-medium tracking-[-0.02em] whitespace-nowrap text-ink sm:text-[22px]">
        Make My Marriage
      </span>
    </Link>
  );
}
