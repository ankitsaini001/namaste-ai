import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPublicEnv, getServerEnv } from './env';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getServerEnv', () => {
  it('returns API_URL without a trailing slash', () => {
    vi.stubEnv('API_URL', 'http://localhost:4000/');
    expect(getServerEnv()).toEqual({ API_URL: 'http://localhost:4000' });
  });

  it('explains what is missing', () => {
    vi.stubEnv('API_URL', '');
    expect(() => getServerEnv()).toThrow(/web app:\n {2}- API_URL/);
  });
});

describe('getPublicEnv', () => {
  it('rejects a value that is not a URL', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'localhost');
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
