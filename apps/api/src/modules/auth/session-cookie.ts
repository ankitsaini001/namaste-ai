import type { CookieOptions } from 'express';
import type { ApiEnv } from '../../config/env';

/** HttpOnly, Secure, SameSite=Lax, Path=/ (API Design §7.1). */
export function sessionCookieOptions(
  env: Pick<ApiEnv, 'COOKIE_DOMAIN' | 'COOKIE_SECURE'>,
): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
  };
}
