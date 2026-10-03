'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ButtonLink } from '@/components/ui/button-link';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';
import { nav } from '@/content/home';
import { cn } from '@/lib/cn';

/** Sticky navigation: gains a thin bottom border once the page scrolls; menu on small screens. */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-ivory/95 backdrop-blur transition-colors',
        scrolled || menuOpen ? 'border-line' : 'border-transparent',
      )}
    >
      <Container className="flex h-18 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {nav.links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-sm font-medium text-muted hover:text-ink">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href={nav.logIn.href}
            className="hidden rounded-md px-2 py-3 text-sm font-medium text-ink hover:text-aubergine lg:inline-block"
          >
            {nav.logIn.label}
          </Link>
          {/* Wrapped so `hidden` doesn't fight the button's own display class. */}
          <div className="hidden sm:block">
            <ButtonLink href={nav.cta.href} size="compact">
              {nav.cta.label}
            </ButtonLink>
          </div>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl text-ink hover:bg-sand lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <X aria-hidden="true" className="size-6" strokeWidth={1.5} />
            ) : (
              <Menu aria-hidden="true" className="size-6" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-ivory lg:hidden">
          <Container className="py-4">
            <ul className="flex flex-col">
              {nav.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={closeMenu}
                    className="block py-3 text-base font-medium text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href={nav.logIn.href}
                  onClick={closeMenu}
                  className="block py-3 text-base font-medium text-ink"
                >
                  {nav.logIn.label}
                </Link>
              </li>
            </ul>
            <ButtonLink href={nav.cta.href} className="mt-3 w-full sm:hidden">
              {nav.cta.label}
            </ButtonLink>
          </Container>
        </nav>
      )}
    </header>
  );
}
