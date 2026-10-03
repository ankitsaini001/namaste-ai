import { z } from 'zod';

// Stored without a trailing slash so paths can be appended directly.
const baseUrl = z.url().transform((value) => value.replace(/\/+$/, ''));

const serverEnvSchema = z.object({ API_URL: baseUrl });
const publicEnvSchema = z.object({ NEXT_PUBLIC_API_URL: baseUrl });

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

function parseEnv<T extends z.ZodType>(schema: T, values: Record<string, unknown>): z.infer<T> {
  const result = schema.safeParse(values);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment variables for the web app:\n${issues}\n` +
        'Copy apps/web/.env.example to apps/web/.env.local and fill it in.',
    );
  }
  return result.data;
}

/** Server-only variables. Call from server code only; never pass the result to the browser. */
export function getServerEnv(): ServerEnv {
  return parseEnv(serverEnvSchema, { API_URL: process.env.API_URL });
}

/** Public variables. Each must be read by its full name so Next.js can inline it. */
export function getPublicEnv(): PublicEnv {
  return parseEnv(publicEnvSchema, { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL });
}
