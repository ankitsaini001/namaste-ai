import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { proxy } from './proxy';

describe('proxy', () => {
  it('sends visitors without a session to /login, remembering where they were going', () => {
    const res = proxy(new NextRequest('http://localhost:3000/app?tab=guests'));
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('returnTo')).toBe('/app?tab=guests');
  });

  it('lets visitors with a session cookie through', () => {
    const res = proxy(
      new NextRequest('http://localhost:3000/app', { headers: { cookie: 'mmm_session=abc' } }),
    );
    expect(res.headers.get('location')).toBeNull();
  });
});
