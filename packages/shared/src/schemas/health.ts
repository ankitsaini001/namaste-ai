import { z } from 'zod';

/** `GET /v1/health` — the process is alive. */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

/** `GET /v1/health/ready` — the API can serve requests (MongoDB reachable). */
export const readinessResponseSchema = z.object({
  status: z.literal('ok'),
  checks: z.object({
    database: z.literal('up'),
  }),
});

export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
