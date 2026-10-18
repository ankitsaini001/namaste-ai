import type { Metadata } from 'next';
import { Overview } from '@/components/app/overview';

export const metadata: Metadata = { title: 'Your wedding · Make My Marriage' };

/** Signed-in home: the wedding overview (DASH-01, DASH-03, DASH-06). */
export default function AppPage() {
  return <Overview />;
}
