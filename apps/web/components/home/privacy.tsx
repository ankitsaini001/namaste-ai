import { Section } from '@/components/ui/section';
import { privacy } from '@/content/home';
import { FramedIcon } from './icons';
import { SectionHeading } from './section-heading';

/** The page's only dark section. */
export function Privacy() {
  return (
    <Section tone="aubergine" labelledBy="privacy-title" className="bg-jaali-light">
      <SectionHeading id="privacy-title" eyebrow={privacy.eyebrow} title={privacy.title} onDark />
      <ul className="mx-auto mt-12 grid max-w-4xl gap-x-12 gap-y-10 md:grid-cols-2 lg:mt-16">
        {privacy.items.map((item) => (
          <li key={item.title} className="flex gap-5">
            <FramedIcon icon={item.icon} onDark />
            <div>
              <h3 className="font-serif text-xl">{item.title}</h3>
              <p className="mt-2 text-body text-ivory/75">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
