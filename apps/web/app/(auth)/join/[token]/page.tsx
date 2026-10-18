import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { JoinFlow } from '@/components/auth/join-flow';

export const metadata: Metadata = {
  title: 'Join the wedding · Make My Marriage',
  // The link is a secret: don't pass it on to other sites.
  referrer: 'no-referrer',
};

/** The join link from an organiser invitation email (ORG-02, ORG-03). */
export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <AuthShell>
      <JoinFlow token={token} />
    </AuthShell>
  );
}
