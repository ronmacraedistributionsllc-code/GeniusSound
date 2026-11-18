import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().default('./.data/storage'),
  API_URL: z.string().default('http://localhost:8000'),
  API_INTERNAL_TOKEN: z.string().default(''),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  WORKER_POLL_MS: z.coerce.number().int().min(250).default(2000),
  NODE_ENV: z.string().default('development'),
});

export type Env = z.infer<typeof schema>;
let cached: Env | null = null;

/** Validated environment. Throws a readable error naming the bad variables. */
export function getEnv(source: Record<string, string | undefined> = process.env): Env {
  if (source === process.env && cached) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  if (parsed.data.NODE_ENV === 'production' && /change-me/i.test(parsed.data.AUTH_SECRET)) {
    throw new Error('Invalid environment: AUTH_SECRET must be changed from the example value in production');
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}
