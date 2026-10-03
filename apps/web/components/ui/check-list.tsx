import { Check } from 'lucide-react';

/** Short feature points with small check marks. */
export function CheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-3 text-body">
          <Check
            aria-hidden="true"
            className="size-4 shrink-0 text-champagne-ink"
            strokeWidth={2}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
