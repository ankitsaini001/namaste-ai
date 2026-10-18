'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type InviteOrganiser, inviteOrganiserSchema, ORGANISER_RULES } from '@mmm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { organisersApi, organisersQueryKey } from '@/lib/organisers-api';

const ROLES = [
  {
    value: 'manager',
    label: 'Manager',
    hint: 'Helps with ceremonies, guests, invitations, the budget and more.',
  },
  {
    value: 'admin',
    label: 'Admin',
    hint: 'Everything a Manager can do, plus inviting organisers and changing settings.',
  },
] as const;

/** ORG-01: invite someone by name, email and role. Used on the Organisers page and in setup. */
export function InviteForm({ idPrefix = 'invite' }: { idPrefix?: string }) {
  const queryClient = useQueryClient();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<InviteOrganiser>({
    resolver: zodResolver(inviteOrganiserSchema),
    defaultValues: { name: '', email: '', role: 'manager' },
  });

  const invite = useMutation({
    mutationFn: organisersApi.invite,
    onMutate: () => setSentTo(null),
    onSuccess: async (sent) => {
      setSentTo(sent.email);
      form.reset({ name: '', email: '', role: form.getValues('role') });
      await queryClient.invalidateQueries({ queryKey: organisersQueryKey });
    },
    onError: (error) => {
      if (error instanceof ApiError && (error.field === 'email' || error.field === 'name')) {
        form.setError(error.field, { message: error.message }, { shouldFocus: true });
      }
    },
  });
  const formError =
    invite.error && !(invite.error instanceof ApiError && invite.error.field)
      ? invite.error.message
      : null;
  const role = form.watch('role');

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => invite.mutate(values))}
      className="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id={`${idPrefix}-name`}
          label="Their name"
          autoComplete="off"
          maxLength={ORGANISER_RULES.nameMax}
          placeholder="Rohit Sharma"
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <TextField
          id={`${idPrefix}-email`}
          label="Their email address"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="rohit@example.com"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">Role</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {ROLES.map((option) => (
            <label
              key={option.value}
              className={cn(
                'flex cursor-pointer gap-3 rounded-xl border bg-white p-4 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-champagne/25',
                role === option.value ? 'border-aubergine' : 'border-line hover:border-champagne',
              )}
            >
              <input
                type="radio"
                value={option.value}
                className="mt-0.5 size-5 shrink-0 accent-aubergine focus-visible:outline-none"
                {...form.register('role')}
              />
              <span>
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" loading={invite.isPending}>
          Send invitation
        </Button>
        <p aria-live="polite" className="text-sm">
          {formError ? (
            <span className="text-terracotta-ink">{formError}</span>
          ) : (
            sentTo && (
              <span className="text-green-ink">
                Invitation sent to {sentTo}. The link works for {ORGANISER_RULES.inviteDays} days.
              </span>
            )
          )}
        </p>
      </div>
    </form>
  );
}
