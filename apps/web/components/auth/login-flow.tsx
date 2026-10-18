'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  AUTH_RULES,
  type EmailCodeRequest,
  type UpdateMe,
  emailCodeRequestSchema,
  updateMeSchema,
} from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api-client';
import { authApi, meQueryKey } from '@/lib/auth-api';
import { ROUTES } from '@/lib/routes';
import { CodeInput } from './code-input';

type Step = 'email' | 'code' | 'name';

const headingClass =
  'font-serif text-[30px] leading-tight font-normal tracking-[-0.015em] sm:text-4xl';

type LoginFlowProps = {
  returnTo: string;
  initialStep: Step;
  /** Replaces "Welcome to Make My Marriage" on the email step. */
  heading?: string;
  subheading?: string;
  /** Shown above every step, such as the invitation on the join page (UX brief, Screen 4). */
  intro?: ReactNode;
  /** A name to prefill on the name step for this email, such as the name someone was invited by. */
  suggestName?: (email: string) => string | undefined;
  /** Runs instead of going to `returnTo` once signed in with a name. */
  onSignedIn?: () => void;
};

/** Email → 6-digit code → (first time only) name. No passwords anywhere (AUTH-02 to AUTH-05). */
export function LoginFlow({
  returnTo,
  initialStep,
  heading,
  subheading,
  intro,
  suggestName,
  onSignedIn,
}: LoginFlowProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(initialStep);
  const [email, setEmail] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Signed in with a name: go on, once. Both the signed-in check and the name step can get here.
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    if (onSignedInRef.current) onSignedInRef.current();
    else router.replace(returnTo);
  }, [returnTo, router]);

  // Already signed in? Go straight on. A 401 here is the normal case.
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me, retry: false });
  useEffect(() => {
    if (!me.data) return;
    if (me.data.needsName) setStep('name');
    else finish();
  }, [me.data, finish]);
  useEffect(() => {
    if (step === 'name' && me.error instanceof ApiError && me.error.status === 401)
      setStep('email');
  }, [step, me.error]);

  // Move focus to the new heading so screen readers announce each step.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  let content: ReactNode;
  if (step === 'code') {
    content = (
      <CodeStep
        email={email}
        headingRef={headingRef}
        onBack={() => setStep('email')}
        onSignedIn={(needsName) => {
          // A new user goes on to the name step; me.data then finishes the others.
          if (needsName) setStep('name');
        }}
      />
    );
  } else if (step === 'name') {
    content = (
      <NameStep
        headingRef={headingRef}
        defaultName={suggestName?.(email || me.data?.user.email || '') ?? ''}
        onDone={finish}
      />
    );
  } else {
    content = (
      <EmailStep
        headingRef={headingRef}
        heading={heading}
        subheading={subheading}
        defaultEmail={email}
        onSent={(sentTo) => {
          setEmail(sentTo);
          void queryClient.invalidateQueries({ queryKey: meQueryKey });
          setStep('code');
        }}
      />
    );
  }
  return (
    <>
      {intro}
      {content}
    </>
  );
}

type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

function EmailStep({
  headingRef,
  heading = 'Welcome to Make My Marriage',
  subheading = 'Sign in or create your account. No passwords to remember.',
  defaultEmail,
  onSent,
}: {
  headingRef: HeadingRef;
  heading?: string;
  subheading?: string;
  defaultEmail: string;
  onSent: (email: string) => void;
}) {
  const form = useForm<EmailCodeRequest>({
    resolver: zodResolver(emailCodeRequestSchema),
    defaultValues: { email: defaultEmail },
  });
  const send = useMutation({
    mutationFn: ({ email }: EmailCodeRequest) => authApi.requestCode(email),
    onSuccess: (_data, { email }) => onSent(email),
  });
  const error = form.formState.errors.email?.message ?? (send.error ? send.error.message : null);

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className={`${headingClass} focus:outline-none`}>
        {heading}
      </h1>
      <p className="mt-3 text-body text-muted">{subheading}</p>
      <form
        className="mt-8"
        noValidate
        onSubmit={form.handleSubmit((values) => send.mutate(values))}
      >
        <TextField
          id="email"
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={error}
          {...form.register('email')}
        />
        <Button type="submit" className="mt-5 w-full" loading={send.isPending}>
          Email me a code
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Just exploring?{' '}
        <Link href={ROUTES.demo} className="font-medium text-ink underline underline-offset-4">
          See a demo wedding
        </Link>
      </p>
    </>
  );
}

function CodeStep({
  email,
  headingRef,
  onBack,
  onSignedIn,
}: {
  email: string;
  headingRef: HeadingRef;
  onBack: () => void;
  onSignedIn: (needsName: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number>(AUTH_RULES.resendAfterSeconds);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // The boxes are disabled while a code is checked, which loses the cursor; put it back in the
  // first box when they're cleared for another try.
  const codeInput = useRef<{ focusFirst: () => void }>(null);
  const [refocus, setRefocus] = useState(0);

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyCode(email, value),
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me);
      onSignedIn(me.needsName);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'LOGIN_CODE_INVALID') {
        setCode('');
        setRefocus((n) => n + 1);
      }
    },
  });

  const resend = useMutation({
    mutationFn: () => authApi.requestCode(email),
    onSuccess: () => {
      verify.reset();
      setCode('');
      setSecondsLeft(AUTH_RULES.resendAfterSeconds);
      setNotice('We sent you a new code.');
      setRefocus((n) => n + 1);
    },
  });

  useEffect(() => {
    if (refocus > 0 && !verify.isPending) codeInput.current?.focusFirst();
  }, [refocus, verify.isPending]);

  const submit = (value: string) => {
    if (value.length === AUTH_RULES.codeLength && !verify.isPending) {
      setNotice(null);
      verify.mutate(value);
    }
  };

  const error = verify.error instanceof ApiError ? verify.error : null;
  const needsNewCode = error?.code === 'LOGIN_CODE_EXPIRED' || error?.code === 'LOGIN_CODE_LOCKED';
  const message = resend.error?.message ?? verify.error?.message ?? null;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-md px-1 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
        Use a different email
      </button>
      <h1 ref={headingRef} tabIndex={-1} className={`${headingClass} mt-4 focus:outline-none`}>
        Check your email
      </h1>
      <p className="mt-3 text-body text-muted">
        We sent a 6-digit code to <span className="font-medium break-all text-ink">{email}</span>.
        It expires in {AUTH_RULES.codeTtlSeconds / 60} minutes.
      </p>

      <form
        className="mt-8"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit(code);
        }}
      >
        <p id="code-label" className="sr-only">
          6-digit code
        </p>
        <CodeInput
          ref={codeInput}
          value={code}
          labelledBy="code-label"
          describedBy={message ? 'code-error' : undefined}
          invalid={Boolean(error)}
          disabled={verify.isPending || needsNewCode}
          onChange={(value) => {
            setCode(value);
            if (value.length === AUTH_RULES.codeLength) submit(value);
          }}
        />
        <div aria-live="polite" className="mt-3 min-h-6 text-sm">
          {message ? (
            <p id="code-error" className="text-terracotta-ink">
              {message}
            </p>
          ) : (
            notice && <p className="text-green-ink">{notice}</p>
          )}
        </div>

        {needsNewCode ? (
          <Button
            className="mt-4 w-full"
            loading={resend.isPending}
            onClick={() => resend.mutate()}
          >
            Send a new code
          </Button>
        ) : (
          <Button
            type="submit"
            className="mt-4 w-full"
            loading={verify.isPending}
            disabled={code.length < AUTH_RULES.codeLength}
          >
            Verify and continue
          </Button>
        )}
      </form>

      {!needsNewCode && (
        <p className="mt-5 text-center text-sm text-muted">
          Didn&apos;t get it?{' '}
          {secondsLeft > 0 ? (
            <span>
              Resend code in {minutes}:{seconds}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => resend.mutate()}
              disabled={resend.isPending}
              className="min-h-11 font-medium text-ink underline underline-offset-4"
            >
              Resend code
            </button>
          )}
        </p>
      )}
    </>
  );
}

function NameStep({
  headingRef,
  defaultName,
  onDone,
}: {
  headingRef: HeadingRef;
  defaultName: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<UpdateMe>({
    resolver: zodResolver(updateMeSchema),
    defaultValues: { name: defaultName },
  });
  const save = useMutation({
    mutationFn: ({ name }: UpdateMe) => authApi.updateName(name),
    onSuccess: (me) => {
      queryClient.setQueryData(meQueryKey, me);
      onDone();
    },
  });
  const error = form.formState.errors.name?.message ?? (save.error ? save.error.message : null);

  return (
    <>
      <h1 ref={headingRef} tabIndex={-1} className={`${headingClass} focus:outline-none`}>
        What should we call you?
      </h1>
      <p className="mt-3 text-body text-muted">
        Your family will see this name when you plan together.
      </p>
      <form
        className="mt-8"
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
      >
        <TextField
          id="name"
          label="Your name"
          autoComplete="name"
          placeholder="e.g. Princi Sharma"
          error={error}
          {...form.register('name')}
        />
        <Button type="submit" className="mt-5 w-full" loading={save.isPending}>
          Continue
        </Button>
      </form>
    </>
  );
}
