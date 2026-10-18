'use client';

import type { Organiser, OrganiserInvite, OrganiserRole } from '@mmm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmPanel, useConfirm } from '@/components/ui/confirm';
import { Container } from '@/components/ui/container';
import { heading } from '@/components/ui/typography';
import { authApi, meQueryKey } from '@/lib/auth-api';
import { organisersApi, organisersQueryKey, ROLE_LABEL } from '@/lib/organisers-api';
import { formatDayMonth, formatStampTime, initials } from '@/lib/wedding-format';
import { InviteForm } from './invite-form';

/** ORG-01 to ORG-10. Admins manage organisers; Managers see who's helping and can leave. */
export function OrganisersPage() {
  const me = useQuery({ queryKey: meQueryKey, queryFn: authApi.me });
  const team = useQuery({ queryKey: organisersQueryKey, queryFn: organisersApi.list });
  const isAdmin = me.data?.role === 'admin';

  return (
    <Container className="max-w-4xl py-8 lg:py-10">
      <h1 className={heading.h2}>Organisers</h1>
      <p className="mt-3 max-w-2xl text-body text-muted">
        The family members helping plan. Admins can do everything; Managers can plan everything
        except organisers and settings.
      </p>

      {isAdmin && (
        <section
          aria-labelledby="invite-heading"
          className="mt-8 rounded-2xl border border-line bg-white p-5 shadow-card sm:p-8"
        >
          <h2 id="invite-heading" className={heading.h3}>
            Invite someone
          </h2>
          <p className="mt-2 mb-6 text-sm text-muted">
            They’ll get an email with a link to join. They sign in with that email address.
          </p>
          <InviteForm />
        </section>
      )}

      {team.isPending ? (
        <p role="status" className="mt-8 text-body text-muted">
          Loading organisers…
        </p>
      ) : team.isError ? (
        <div role="alert" className="mt-8">
          <p className="text-body">{team.error.message}</p>
          <Button className="mt-4" onClick={() => void team.refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <>
          <section aria-labelledby="team-heading" className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="team-heading" className={heading.h3}>
                Planning together ({team.data.organisers.length})
              </h2>
              <p className="text-sm text-muted">
                {team.data.organisers.length + team.data.invites.filter((i) => !i.expired).length}{' '}
                of {team.data.limit} places used
              </p>
            </div>
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
              {team.data.organisers.map((organiser) => (
                <OrganiserRow key={organiser.userId} organiser={organiser} canManage={isAdmin} />
              ))}
            </ul>
          </section>

          {team.data.invites.length > 0 && (
            <section aria-labelledby="invites-heading" className="mt-10">
              <h2 id="invites-heading" className={heading.h3}>
                Waiting to join ({team.data.invites.length})
              </h2>
              <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
                {team.data.invites.map((invite) => (
                  <InviteRow key={invite.id} invite={invite} canManage={isAdmin} />
                ))}
              </ul>
            </section>
          )}

          {me.data?.role === 'manager' && <LeaveSection />}
        </>
      )}
    </Container>
  );
}

function OrganiserRow({ organiser, canManage }: { organiser: Organiser; canManage: boolean }) {
  const queryClient = useQueryClient();
  const name = organiser.name ?? organiser.email;
  const changeRole = useMutation({
    mutationFn: (role: OrganiserRole) => organisersApi.changeRole(organiser.userId, role),
    onSuccess: async (list) => {
      queryClient.setQueryData(organisersQueryKey, list);
      // Changing your own role changes what you can do here.
      if (organiser.isYou) await queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
  const remove = useMutation({
    mutationFn: () => organisersApi.remove(organiser.userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: organisersQueryKey }),
  });
  const error = changeRole.error ?? remove.error;
  const confirm = useConfirm();

  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Avatar name={organiser.name} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {name}
            {organiser.isYou && <span className="ml-2 text-sm font-normal text-muted">(you)</span>}
          </p>
          <p className="truncate text-sm text-muted">{organiser.email}</p>
          <p className="mt-1 text-xs text-muted">
            {organiser.added &&
              `Joined ${formatStampTime(organiser.added.at)}${organiser.added.by ? ` · invited by ${organiser.added.by}` : ''}`}
            {organiser.lastChanged && (
              <span className="block">
                Made {ROLE_LABEL[organiser.role]}
                {organiser.lastChanged.by && ` by ${organiser.lastChanged.by}`} ·{' '}
                {formatStampTime(organiser.lastChanged.at)}
              </span>
            )}
          </p>
        </div>
        {canManage ? (
          <div className="flex w-full flex-wrap items-center gap-2 pl-14 sm:w-auto sm:pl-0">
            <label className="sr-only" htmlFor={`role-${organiser.userId}`}>
              Role for {name}
            </label>
            <select
              id={`role-${organiser.userId}`}
              value={organiser.role}
              disabled={changeRole.isPending}
              onChange={(e) => changeRole.mutate(e.target.value as OrganiserRole)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm text-ink focus-visible:border-champagne focus-visible:ring-4 focus-visible:ring-champagne/25 focus-visible:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
            {!organiser.isYou && (
              <Button
                ref={confirm.triggerRef}
                variant="ghost"
                size="compact"
                aria-expanded={confirm.asking}
                onClick={confirm.open}
              >
                Remove<span className="sr-only"> {name}</span>
              </Button>
            )}
          </div>
        ) : (
          <Badge tone={organiser.role === 'admin' ? 'dark' : 'neutral'}>
            {ROLE_LABEL[organiser.role]}
          </Badge>
        )}
      </div>
      {confirm.asking && (
        <ConfirmPanel
          question={`Remove ${name}? They’ll lose access straight away.`}
          confirmLabel={`Remove ${name}`}
          pending={remove.isPending}
          onConfirm={() => remove.mutate()}
          onKeep={confirm.close}
        />
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-terracotta-ink">
          {error.message}
        </p>
      )}
    </li>
  );
}

function InviteRow({ invite, canManage }: { invite: OrganiserInvite; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [resent, setResent] = useState(false);
  const refresh = () => queryClient.invalidateQueries({ queryKey: organisersQueryKey });
  const resend = useMutation({
    mutationFn: () => organisersApi.resend(invite.id),
    onMutate: () => setResent(false),
    onSuccess: async () => {
      setResent(true);
      await refresh();
    },
  });
  const cancel = useMutation({
    mutationFn: () => organisersApi.cancel(invite.id),
    onSuccess: refresh,
  });
  const error = resend.error ?? cancel.error;
  const confirm = useConfirm();

  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Avatar name={invite.name} muted />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {invite.name}{' '}
            <span className="text-sm font-normal text-muted">· {ROLE_LABEL[invite.role]}</span>
          </p>
          <p className="truncate text-sm text-muted">{invite.email}</p>
          <p className="mt-1 text-sm">
            {invite.expired ? (
              <Badge tone="countdown">Expired {formatDayMonth(invite.expiresAt)}</Badge>
            ) : (
              <span className="text-muted">
                Sent {formatStampTime(invite.sentAt)}
                {invite.sentByName && ` by ${invite.sentByName}`} · link works until{' '}
                {formatDayMonth(invite.expiresAt)}
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex w-full flex-wrap items-center gap-2 pl-14 sm:w-auto sm:pl-0">
            <Button
              variant="secondary"
              size="compact"
              loading={resend.isPending}
              onClick={() => resend.mutate()}
            >
              Resend
              <span className="sr-only"> the invitation to {invite.name}</span>
            </Button>
            <Button
              ref={confirm.triggerRef}
              variant="ghost"
              size="compact"
              aria-expanded={confirm.asking}
              onClick={confirm.open}
            >
              Cancel<span className="sr-only"> the invitation to {invite.name}</span>
            </Button>
          </div>
        )}
      </div>
      {confirm.asking && (
        <ConfirmPanel
          question={`Cancel ${invite.name}’s invitation? The link will stop working.`}
          confirmLabel="Cancel invitation"
          keepLabel="Keep it"
          pending={cancel.isPending}
          onConfirm={() => cancel.mutate()}
          onKeep={confirm.close}
        />
      )}
      <p aria-live="polite" className="text-sm">
        {error ? (
          <span role="alert" className="mt-3 block text-terracotta-ink">
            {error.message}
          </span>
        ) : (
          resent && <span className="mt-3 block text-green-ink">Sent again with a new link.</span>
        )}
      </p>
    </li>
  );
}

/** ORG-09: a Manager leaving; the app then offers them setup for a wedding of their own. */
function LeaveSection() {
  const queryClient = useQueryClient();
  const leave = useMutation({
    mutationFn: organisersApi.leave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
  const confirm = useConfirm();
  return (
    <section aria-labelledby="leave-heading" className="mt-12 border-t border-line pt-8">
      <h2 id="leave-heading" className={heading.h3}>
        Leave this wedding
      </h2>
      <p className="mt-2 max-w-xl text-sm text-muted">
        You’ll stop seeing this wedding straight away. What you added stays. An Admin can invite you
        again.
      </p>
      <Button
        ref={confirm.triggerRef}
        variant="secondary"
        className="mt-4"
        aria-expanded={confirm.asking}
        onClick={confirm.open}
      >
        Leave this wedding
      </Button>
      {confirm.asking && (
        <ConfirmPanel
          question="Leave this wedding? You’ll lose access straight away."
          confirmLabel="Leave"
          keepLabel="Stay"
          pending={leave.isPending}
          onConfirm={() => leave.mutate()}
          onKeep={confirm.close}
        />
      )}
      {leave.isError && (
        <p role="alert" className="mt-3 text-sm text-terracotta-ink">
          {leave.error.message}
        </p>
      )}
    </section>
  );
}

function Avatar({ name, muted }: { name: string | null; muted?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={
        muted
          ? 'flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-champagne text-sm font-semibold text-champagne-ink'
          : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-aubergine text-sm font-semibold text-ivory'
      }
    >
      {initials(name)}
    </span>
  );
}
