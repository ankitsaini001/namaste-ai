import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'Must start with mongodb:// or mongodb+srv://'),
});

/** Variables both the API and the worker need. */
export type BaseEnv = z.infer<typeof baseEnvSchema>;

/** Login-code requests per IP per hour (API Design §10). */
export const EMAIL_CODE_IP_LIMIT = 10;

export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  // Normalised to a bare origin so it matches the browser's Origin header exactly.
  WEB_ORIGIN: z.url().transform((value) => new URL(value).origin),
  // Keys the hash of each login code, so a database leak doesn't reveal codes.
  LOGIN_CODE_SECRET: z.string().min(32, 'Use a random value of at least 32 characters'),
  // Production: .makemymarriage.com, so the cookie works on the site and the API. Unset locally.
  COOKIE_DOMAIN: z.string().min(1).optional(),
  // Browsers accept Secure cookies on http://localhost, so this stays true locally too.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  // Express "trust proxy" setting when behind Caddy, so rate limits see the visitor's IP.
  TRUST_PROXY: z.string().min(1).optional(),
  // Login-code requests per IP per hour (API Design §10). Keep 10 in production; the browser
  // tests start their own API with more, since every test signs someone in.
  EMAIL_CODE_IP_LIMIT: z.coerce.number().int().min(1).default(EMAIL_CODE_IP_LIMIT),
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

const emailEnvSchema = z.object({
  // smtp = Mailpit locally; resend = production (System Design §13).
  EMAIL_TRANSPORT: z.enum(['smtp', 'resend']).default('smtp'),
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z
    .string()
    .regex(/^(.+ <[^@\s]+@[^>\s]+>|[^@\s]+@[^@\s]+)$/, 'Use "Name <address>" or an address')
    .default('Make My Marriage <no-reply@localhost>'),
  // Resend's free plan: 100 a day, 20 always kept for login codes and organiser invitations.
  EMAIL_DAILY_LIMIT: z.coerce.number().int().min(1).default(100),
  EMAIL_RESERVED: z.coerce.number().int().min(0).default(20),
});

export const workerEnvSchema = baseEnvSchema
  .extend(emailEnvSchema.shape)
  .superRefine((env, ctx) => {
    if (env.EMAIL_TRANSPORT === 'resend' && !env.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Required when EMAIL_TRANSPORT=resend',
      });
    }
    if (env.EMAIL_RESERVED >= env.EMAIL_DAILY_LIMIT) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_RESERVED'],
        message: 'Must be less than EMAIL_DAILY_LIMIT',
      });
    }
  });

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export const validateWorkerEnv = (raw: Record<string, unknown>): WorkerEnv =>
  parseEnv(workerEnvSchema, raw, 'worker');
