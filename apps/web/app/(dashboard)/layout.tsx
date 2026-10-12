import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Make My Marriage',
  // Organiser screens are private.
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
