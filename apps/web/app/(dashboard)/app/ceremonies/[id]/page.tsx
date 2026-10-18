import type { Metadata } from 'next';
import { EditCeremony } from '@/components/ceremonies/edit-ceremony';

export const metadata: Metadata = { title: 'Ceremony · Make My Marriage' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditCeremony id={id} />;
}
