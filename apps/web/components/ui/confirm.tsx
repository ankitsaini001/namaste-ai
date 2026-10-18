'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Button } from './button';

/** Asking once more before something that can't be undone, on a line under the row. */
export function useConfirm() {
  const [asking, setAsking] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return {
    asking,
    triggerRef,
    open: () => setAsking(true),
    close: () => {
      setAsking(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    },
  };
}

export function ConfirmPanel({
  question,
  confirmLabel,
  keepLabel = 'Keep',
  pending,
  onConfirm,
  onKeep,
  children,
}: {
  question: string;
  confirmLabel: string;
  keepLabel?: string;
  pending: boolean;
  onConfirm: () => void;
  onKeep: () => void;
  /** More about what will happen, under the question. */
  children?: ReactNode;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  // Focus the confirm button once it can take focus (it waits while, say, the impact loads).
  const focused = useRef(false);
  useEffect(() => {
    if (pending || focused.current) return;
    focused.current = true;
    confirmRef.current?.focus();
  }, [pending]);
  return (
    <div
      role="group"
      aria-label={question}
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-terracotta-tint px-4 py-3"
    >
      <div className="w-full text-sm text-terracotta-ink sm:w-auto sm:flex-1">
        <p>{question}</p>
        {children}
      </div>
      <Button ref={confirmRef} size="compact" loading={pending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="compact" disabled={pending} onClick={onKeep}>
        {keepLabel}
      </Button>
    </div>
  );
}
