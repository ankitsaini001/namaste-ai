import { describe, expect, it } from 'vitest';
import {
  errorResponseSchema,
  healthResponseSchema,
  LIMITS,
  readinessResponseSchema,
} from './index';

describe('LIMITS', () => {
  it('matches the per-wedding limits in PRD §29.2', () => {
    expect(LIMITS).toEqual({
      organisers: 20,
      events: 20,
      guests: 1000,
      tasks: 500,
      shoppingItems: 1000,
      vendors: 200,
      expenses: 500,
      photos: 2000,
    });
  });
});

describe('health schemas', () => {
  it('accepts the liveness response', () => {
    expect(healthResponseSchema.parse({ status: 'ok' })).toEqual({ status: 'ok' });
  });

  it('accepts a ready response and rejects a database that is down', () => {
    expect(
      readinessResponseSchema.safeParse({ status: 'ok', checks: { database: 'up' } }).success,
    ).toBe(true);
    expect(
      readinessResponseSchema.safeParse({ status: 'ok', checks: { database: 'down' } }).success,
    ).toBe(false);
  });
});

describe('errorResponseSchema', () => {
  it('accepts the standard error envelope', () => {
    const body = {
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Try again shortly.', field: null },
      requestId: 'req_123',
    };
    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects a body without requestId', () => {
    const body = { error: { code: 'NOT_FOUND', message: 'Not found.', field: null } };
    expect(errorResponseSchema.safeParse(body).success).toBe(false);
  });
});
