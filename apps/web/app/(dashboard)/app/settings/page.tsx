import type { Metadata } from 'next';
import { SettingsPage } from '@/components/settings/settings-page';

export const metadata: Metadata = { title: 'Settings · Make My Marriage' };

/** Wedding settings, for Admins (PRD §27). */
export default function Page() {
  return <SettingsPage />;
}
