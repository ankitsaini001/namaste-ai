import { SESSION_COOKIE } from '@mmm/shared';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Sends visitors without a session cookie to the login page. It only checks that the cookie
 * exists; the API checks the session itself on every request (System Design §9.2).
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL('/login', request.url);
  login.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/app/:path*'],
};
