import { Plus } from 'lucide-react';
import { Section } from '@/components/ui/section';
import { faq } from '@/content/home';
import { SectionHeading } from './section-heading';

/** Native <details> accordion: works without JavaScript and with the keyboard. */
export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-title">
      <SectionHeading id="faq-title" eyebrow={faq.eyebrow} title={faq.title} />
      <div className="mx-auto mt-12 max-w-3xl space-y-3 lg:mt-16">
        {faq.items.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-line bg-white open:shadow-card"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-serif text-lg lg:px-6 [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus
                aria-hidden="true"
                className="size-5 shrink-0 text-champagne-ink transition-transform group-open:rotate-45"
                strokeWidth={1.5}
              />
            </summary>
            <p className="px-5 pb-5 text-body text-muted lg:px-6">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
