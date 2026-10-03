import { Eyebrow } from '@/components/ui/eyebrow';
import { heading } from '@/components/ui/typography';
import { cn } from '@/lib/cn';

/** Centred eyebrow + H2 used at the top of most sections. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  onDark = false,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-3xl text-center', className)}>
      {eyebrow && <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>}
      <h2 id={id} className={cn(heading.h2, eyebrow && 'mt-4')}>
        {title}
      </h2>
    </div>
  );
}
