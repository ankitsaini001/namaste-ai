import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Set up your wedding · Make My Marriage',
  robots: { index: false, follow: false },
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
