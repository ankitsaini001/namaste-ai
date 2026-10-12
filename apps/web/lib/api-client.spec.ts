import { emailCodeSentSchema } from '@mmm/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, apiRequest } from './api-client';

const reply = (status: number, body?: unknown) =>
  vi.fn(async () =>
    status === 204
      ? new Response(null, { status })
      : new Response(JSON.stringify(body), { status }),
  );

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://api.test'));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends JSON with the session cookie and parses the reply', async () => {
    const fetch = reply(202, { sent: true, expiresInSeconds: 600 });
    vi.stubGlobal('fetch', fetch);
    const result = await apiRequest('/auth/email-code', {
      method: 'POST',
      body: { email: 'a@b.co' },
      schema: emailCodeSentSchema,
    });
    expect(result).toEqual({ sent: true, expiresInSeconds: 600 });
    expect(fetch).toHaveBeenCalledWith('http://api.test/v1/auth/email-code', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"a@b.co"}',
    });
  });

  it('turns the error envelope into an ApiError with code, message and details', async () => {
    vi.stubGlobal(
      'fetch',
      reply(400, {
        error: {
          code: 'LOGIN_CODE_INVALID',
          message: "That code isn't right. 3 tries left.",
          field: 'code',
          details: { attemptsLeft: 3 },
        },
        requestId: 'req_1',
      }),
    );
    const error = await apiRequest('/x', { schema: z.unknown() }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'LOGIN_CODE_INVALID',
      message: "That code isn't right. 3 tries left.",
      field: 'code',
      details: { attemptsLeft: 3 },
      requestId: 'req_1',
    });
  });

  it('reports network failures as NETWORK_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    await expect(apiRequest('/x', { schema: z.unknown() })).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('handles 204 No Content', async () => {
    vi.stubGlobal('fetch', reply(204));
    await expect(
      apiRequest('/auth/logout', { method: 'POST', schema: z.undefined() }),
    ).resolves.toBeUndefined();
  });
});
