'use client';

import type { Me } from '@mmm/shared';
import { LayoutDashboard, LogOut, type LucideIcon, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { cn } from '@/lib/cn';
import { ROLE_LABEL } from '@/lib/organisers-api';
import { formatWeddingDate, initials } from '@/lib/wedding-format';
import { useLogout } from './use-logout';

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

/**
 * The sections that exist so far (UX brief, app layout). Each feature adds its own: Ceremonies,
 * Guests, Invitations and the rest, then Settings for Admins.
 */
const PLANNING: NavItem[] = [
  { href: '/app', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
];
const TEAM: NavItem[] = [
  { href: '/app/organisers', label: 'Organisers', icon: Users },
  { href: '/app/settings', label: 'Settings', icon: Settings, adminOnly: true },
];

const isActive = (pathname: string, href: string) =>
  href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(`${href}/`);

/** Signed-in layout: a sand sidebar on desktop; a top bar and bottom tabs on phones. */
export function AppShell({
  me,
  onLeave,
  children,
}: {
  me: Me;
  onLeave: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const logout = useLogout(onLeave);
  const wedding = me.wedding;
  const roleLabel = me.role === 'admin' || me.role === 'manager' ? ROLE_LABEL[me.role] : null;
  const team = TEAM.filter((item) => !item.adminOnly || me.role === 'admin');

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[264px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-ivory px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-sand px-5 py-6 lg:flex">
        <Logo />
        {wedding && (
          <div className="mt-6 rounded-xl border border-line bg-ivory px-4 py-3">
            <p className="font-serif text-lg leading-snug text-ink">{wedding.title}</p>
            <p className="mt-0.5 text-sm text-muted">{formatWeddingDate(wedding.date)}</p>
          </div>
        )}
        <nav aria-label="Main" className="mt-6 flex-1">
          <NavList items={PLANNING} pathname={pathname} />
          <div role="separator" className="my-4 border-t border-line" />
          <NavList items={team} pathname={pathname} />
        </nav>
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-aubergine text-sm font-semibold text-ivory"
            >
              {initials(me.user.name)}
            </span>
            <p className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium text-ink">{me.user.name}</span>
              {roleLabel && <span className="block text-xs text-muted">{roleLabel}</span>}
            </p>
          </div>
          <Button
            variant="ghost"
            size="compact"
            className="mt-2 w-full justify-start px-3"
            loading={logout.isPending}
            onClick={() => logout.mutate()}
          >
            <LogOut aria-hidden="true" className="size-4" />
            Log out
          </Button>
        </div>
        {logout.isError && (
          <p role="alert" className="mt-2 text-sm text-terracotta-ink">
            {logout.error.message}
          </p>
        )}
      </aside>

      {/* Phone top bar */}
      <header className="flex h-16 items-center justify-between gap-3 border-b border-line bg-ivory px-4 lg:hidden">
        <Logo />
        <Button
          variant="ghost"
          size="compact"
          loading={logout.isPending}
          onClick={() => logout.mutate()}
        >
          Log out
        </Button>
      </header>

      <main id="main" tabIndex={-1} className="min-w-0 pb-24 focus:outline-none lg:pb-0">
        {children}
      </main>

      {/* Phone bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {[...PLANNING, ...team].map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium',
                    active ? 'text-aubergine' : 'text-muted hover:text-ink',
                  )}
                >
                  <item.icon aria-hidden="true" className="size-5" strokeWidth={1.5} />
                  {item.shortLabel ?? item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 text-[15px] transition-colors',
                active
                  ? 'border-champagne bg-ivory font-medium text-aubergine'
                  : 'border-transparent text-ink hover:bg-ivory/60',
              )}
            >
              <item.icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.5} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
