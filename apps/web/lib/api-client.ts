import { errorResponseSchema } from '@mmm/shared';
import type { z } from 'zod';
import { getPublicEnv } from './env';

/** An error reply from the API, or a network failure (code NETWORK_ERROR, status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field: string | null = null,
    readonly details: Record<string, unknown> = {},
    readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Parses the success reply; replies are checked against the shared schemas. */
  schema: z.ZodType<T>;
};

/** Calls the API from the browser with the session cookie. Error messages can be shown as is. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, schema }: RequestOptions<T>,
) {
  let res: Response;
  try {
    res = await fetch(`${getPublicEnv().NEXT_PUBLIC_API_URL}/v1${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      "We couldn't reach Make My Marriage. Check your connection and try again.",
    );
  }

  if (res.status === 204) return schema.parse(undefined);
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(json);
    if (parsed.success) {
      const { error, requestId } = parsed.data;
      throw new ApiError(
        res.status,
        error.code,
        error.message,
        error.field,
        error.details,
        requestId,
      );
    }
    throw new ApiError(
      res.status,
      'INTERNAL_ERROR',
      'Something went wrong on our side. Please try again.',
    );
  }
  return schema.parse(json);
}
