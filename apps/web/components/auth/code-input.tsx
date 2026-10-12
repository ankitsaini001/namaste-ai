'use client';

import { type ClipboardEvent, type KeyboardEvent, useRef } from 'react';
import { cn } from '@/lib/cn';

const LENGTH = 6;

type CodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
};

/**
 * Six separate digit boxes (UX brief §12). Typing moves to the next box, Backspace to the previous,
 * and pasting or a phone's code autofill fills every box at once.
 */
export function CodeInput({
  value,
  onChange,
  invalid,
  disabled,
  labelledBy,
  describedBy,
}: CodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] ?? '');

  const focus = (index: number) =>
    inputs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  const fillFrom = (index: number, text: string) => {
    const incoming = text.replace(/\D/g, '');
    if (!incoming) return;
    const next = [...digits];
    incoming
      .slice(0, LENGTH - index)
      .split('')
      .forEach((digit, offset) => (next[index + offset] = digit));
    onChange(next.join('').slice(0, LENGTH));
    focus(index + incoming.length);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index]) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = '';
      onChange(next.join(''));
      focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      focus(index + 1);
    }
  };

  const onPaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData('text'));
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="flex gap-2 sm:gap-3"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el;
          }}
          value={digit}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${LENGTH}`}
          aria-invalid={invalid || undefined}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          onChange={(event) => {
            const text = event.target.value;
            if (text === '') {
              const next = [...digits];
              next[index] = '';
              onChange(next.join(''));
            } else {
              fillFrom(index, text);
            }
          }}
          className={cn(
            'size-12 rounded-xl border bg-white text-center font-sans text-xl font-semibold text-ink tabular-nums focus:outline-none focus-visible:ring-4 focus-visible:outline-none disabled:opacity-60 sm:size-14',
            invalid
              ? 'border-terracotta focus-visible:ring-terracotta/15'
              : 'border-line focus-visible:border-aubergine focus-visible:ring-aubergine/10',
          )}
        />
      ))}
    </div>
  );
}
