/** Runs once when the Next.js server starts. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { checkEnvOrExit } = await import('./lib/env-check');
    checkEnvOrExit();
  }
}
