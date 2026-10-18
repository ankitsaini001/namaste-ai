'use client';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';
import { useLogout } from './use-logout';

const ROLE_LABEL = { admin: 'Admin', manager: 'Manager', demo: 'Demo' } as const;

/** The top bar during setup, before the app's navigation applies. */
export function AppHeader({
  name,
  role,
  onLeave,
}: {
  name?: string | null;
  role?: keyof typeof ROLE_LABEL | null;
  onLeave?: () => void;
}) {
  const logout = useLogout(onLeave);

  return (
    <header className="border-b border-line bg-ivory">
      <Container className="flex h-18 items-center justify-between gap-4">
        <Logo />
        {name !== undefined && (
          <div className="flex items-center gap-3">
            <p className="hidden text-right text-sm sm:block">
              <span className="block font-medium text-ink">{name}</span>
              {role && <span className="block text-xs text-muted">{ROLE_LABEL[role]}</span>}
            </p>
            <Button
              variant="ghost"
              size="compact"
              loading={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Log out
            </Button>
          </div>
        )}
      </Container>
      {logout.isError && (
        <Container>
          <p role="alert" className="pb-3 text-sm text-terracotta-ink">
            {logout.error.message}
          </p>
        </Container>
      )}
    </header>
  );
}
