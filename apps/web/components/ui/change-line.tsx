import type { ChangeStamp } from '@mmm/shared';
import { cn } from '@/lib/cn';
import { formatStampTime } from '@/lib/wedding-format';

const describe = (verb: string, stamp: ChangeStamp) =>
  `${verb}${stamp.by ? ` by ${stamp.by}` : ''} · ${formatStampTime(stamp.at)}`;

/**
 * "Last changed by Rohit Sharma · 18 Oct, 11:05 am", in the section it's about (owner's decision,
 * 18 Oct 2026). Shows the latest change, or who added it if it hasn't changed; `both` shows both.
 */
export function ChangeLine({
  added,
  lastChanged,
  addedVerb = 'Added',
  changedVerb = 'Last changed',
  both = false,
  className,
}: {
  added: ChangeStamp | null;
  lastChanged: ChangeStamp | null;
  addedVerb?: string;
  changedVerb?: string;
  both?: boolean;
  className?: string;
}) {
  const lines = [
    (both || !lastChanged) && added && describe(addedVerb, added),
    lastChanged && describe(changedVerb, lastChanged),
  ].filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <p className={cn('text-xs text-muted', className)}>
      {lines.map((line, index) => (
        <span key={index} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}
