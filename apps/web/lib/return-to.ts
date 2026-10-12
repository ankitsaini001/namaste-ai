/**
 * Where to go after login. Only same-site paths are accepted, so a crafted link can't send people
 * to another website after they sign in.
 */
export function safeReturnTo(value: string | null | undefined, fallback = '/app'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  return value;
}
