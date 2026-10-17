import type { Ref, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  ref?: Ref<HTMLTextAreaElement>;
};

export function TextArea({ id, label, hint, error, className, ref, ...props }: TextAreaProps) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ');
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <textarea
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          'mt-2 block min-h-24 w-full rounded-xl border bg-white px-4 py-3 text-base text-ink placeholder:text-muted/70 focus:outline-none focus-visible:ring-4 focus-visible:outline-none',
          error
            ? 'border-terracotta focus-visible:ring-terracotta/15'
            : 'border-line focus-visible:border-champagne focus-visible:ring-champagne/25',
        )}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm text-terracotta-ink">
          {error}
        </p>
      )}
    </div>
  );
}
