import { getPublicEnv, getServerEnv } from './env';

/** Stops the server when environment variables are invalid, so it never runs half-configured. */
export function checkEnvOrExit(): void {
  try {
    getServerEnv();
    getPublicEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
