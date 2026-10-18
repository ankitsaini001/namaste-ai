import type { Metadata } from 'next';
import { CeremoniesPage } from '@/components/ceremonies/ceremonies-page';

export const metadata: Metadata = { title: 'Ceremonies · Make My Marriage' };

/** The wedding's ceremonies (EVT-01 to EVT-08). */
export default function Page() {
  return <CeremoniesPage />;
}
