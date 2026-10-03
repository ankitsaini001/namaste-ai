import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Logo } from '@/components/ui/logo';
import { footer } from '@/content/home';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-ivory">
      <Container className="py-14 lg:py-16">
        <div className="grid grid-cols-3 gap-x-6 gap-y-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-3 lg:col-span-1">
            <Logo />
            <p className="mt-4 font-serif text-lg text-muted italic">{footer.tagline}</p>
          </div>
          {footer.columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-eyebrow font-semibold text-champagne-ink uppercase">
                {column.title}
              </p>
              <ul className="mt-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-12 border-t border-line pt-6 text-sm text-muted">{footer.copyright}</p>
      </Container>
    </footer>
  );
}
