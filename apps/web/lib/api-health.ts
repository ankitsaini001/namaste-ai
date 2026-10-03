import { errorResponseSchema, readinessResponseSchema } from '@mmm/shared';

export type ApiReadiness =
  | { state: 'ready' }
  | { state: 'not_ready'; message: string; requestId: string }
  | { state: 'unreachable'; message: string };

/** Calls `GET /v1/health/ready` and describes the result. Never throws. */
export async function getApiReadiness(
  apiUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ApiReadiness> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiUrl}/v1/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    return { state: 'unreachable', message: `Could not reach the API at ${apiUrl}.` };
  }

  const body: unknown = await res.json().catch(() => null);
  if (res.ok && readinessResponseSchema.safeParse(body).success) {
    return { state: 'ready' };
  }

  const error = errorResponseSchema.safeParse(body);
  if (error.success) {
    return {
      state: 'not_ready',
      message: error.data.error.message,
      requestId: error.data.requestId,
    };
  }
  return {
    state: 'unreachable',
    message: `Unexpected response from the API (HTTP ${res.status}).`,
  };
}
