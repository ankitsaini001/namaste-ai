import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  // Normalised to a bare origin so it matches the browser's Origin header exactly.
  WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

function parseEnv<T extends z.ZodType>(
  schema: T,
  raw: Record<string, unknown>,
  processName: string,
): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment variables for the ${processName}:\n${issues}\n` +
        'Copy apps/api/.env.example to apps/api/.env and fill it in.',
    );
  }
  return result.data;
}

export const validateApiEnv = (raw: Record<string, unknown>): ApiEnv =>
  parseEnv(apiEnvSchema, raw, 'API');
