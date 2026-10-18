import type { Metadata } from 'next';
import { NewCeremony } from '@/components/ceremonies/new-ceremony';

export const metadata: Metadata = { title: 'Add a ceremony · Make My Marriage' };

export default function Page() {
  return <NewCeremony />;
}
