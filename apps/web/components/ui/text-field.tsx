import type { InputHTMLAttributes, Ref } from 'react';
import { cn } from '@/lib/cn';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string | null;
  ref?: Ref<HTMLInputElement>;
};

/** Label always visible above the input (UX brief §12); errors appear right below it. */
export function TextField({ id, label, error, className, ref, ...props }: TextFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'mt-2 block h-13 w-full rounded-xl border bg-white px-4 text-base text-ink placeholder:text-muted/70 focus:outline-none focus-visible:ring-4 focus-visible:outline-none',
          error
            ? 'border-terracotta focus-visible:ring-terracotta/15'
            : 'border-line focus-visible:border-champagne focus-visible:ring-champagne/25',
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-2 text-sm text-terracotta-ink">
          {error}
        </p>
      )}
    </div>
  );
}
