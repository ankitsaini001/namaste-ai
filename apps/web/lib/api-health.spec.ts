import { describe, expect, it } from 'vitest';
import { getApiReadiness } from './api-health';

const API_URL = 'http://api.test';

function fakeFetch(status: number, body: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe('getApiReadiness', () => {
  it('is ready when the API and its database are up', async () => {
    const fetch = fakeFetch(200, { status: 'ok', checks: { database: 'up' } });
    await expect(getApiReadiness(API_URL, fetch)).resolves.toEqual({ state: 'ready' });
  });

  it('passes on the message and request ID when the API is not ready', async () => {
    const fetch = fakeFetch(503, {
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Try again shortly.', field: null },
      requestId: 'req_abc',
    });
    await expect(getApiReadiness(API_URL, fetch)).resolves.toEqual({
      state: 'not_ready',
      message: 'Try again shortly.',
      requestId: 'req_abc',
    });
  });

  it('is unreachable when the request fails', async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new TypeError('fetch failed');
    };
    await expect(getApiReadiness(API_URL, fetch)).resolves.toEqual({
      state: 'unreachable',
      message: 'Could not reach the API at http://api.test.',
    });
  });

  it('is unreachable when the response is not what the API sends', async () => {
    const fetch = fakeFetch(200, '<html>');
    await expect(getApiReadiness(API_URL, fetch)).resolves.toEqual({
      state: 'unreachable',
      message: 'Unexpected response from the API (HTTP 200).',
    });
  });
});
