import { AuthShell } from '@/components/auth/auth-shell';
import { LoginFlow } from '@/components/auth/login-flow';
import { safeReturnTo } from '@/lib/return-to';

type LoginPageProps = {
  searchParams: Promise<{ returnTo?: string | string[]; step?: string | string[] }>;
};

/**
 * Organiser login with an email code (AUTH-02 to AUTH-05). Google sign-in (AUTH-01) comes next.
 * The URL is read here, on the server, so the form is in the first HTML response.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo, step } = await searchParams;
  return (
    <AuthShell>
      <LoginFlow
        returnTo={safeReturnTo(typeof returnTo === 'string' ? returnTo : null)}
        initialStep={step === 'name' ? 'name' : 'email'}
      />
    </AuthShell>
  );
}
