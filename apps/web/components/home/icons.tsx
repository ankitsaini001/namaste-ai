import {
  Ban,
  ClipboardList,
  EyeOff,
  Images,
  Lock,
  SlidersHorizontal,
  UserRoundSearch,
  type LucideIcon,
} from 'lucide-react';
import type { IconKey } from '@/content/home';
import { cn } from '@/lib/cn';

const ICONS: Record<IconKey, LucideIcon> = {
  users: UserRoundSearch,
  headcount: ClipboardList,
  photos: Images,
  lock: Lock,
  hidden: EyeOff,
  'no-ads': Ban,
  control: SlidersHorizontal,
};

/** Thin line icon (1.5px stroke) in a soft round or square frame. */
export function FramedIcon({
  icon,
  shape = 'square',
  onDark = false,
}: {
  icon: IconKey;
  shape?: 'square' | 'round';
  onDark?: boolean;
}) {
  const Icon = ICONS[icon];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center border',
        shape === 'round' ? 'rounded-full' : 'rounded-xl',
        onDark
          ? 'border-champagne/40 text-champagne'
          : 'border-champagne/60 bg-ivory text-champagne-ink',
      )}
    >
      <Icon className="size-5" strokeWidth={1.5} />
    </span>
  );
}
