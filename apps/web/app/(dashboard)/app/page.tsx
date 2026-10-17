import type { Metadata } from 'next';
import { AppHome } from '@/components/app/app-home';

export const metadata: Metadata = { title: 'Your wedding · Make My Marriage' };

/** Signed-in home: the wedding overview (DASH-01, DASH-03, DASH-06). */
export default function AppPage() {
  return <AppHome />;
}
