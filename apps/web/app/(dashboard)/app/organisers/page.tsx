import type { Metadata } from 'next';
import { OrganisersPage } from '@/components/organisers/organisers-page';

export const metadata: Metadata = { title: 'Organisers · Make My Marriage' };

/** Who helps plan the wedding (ORG-01 to ORG-10). */
export default function Page() {
  return <OrganisersPage />;
}
