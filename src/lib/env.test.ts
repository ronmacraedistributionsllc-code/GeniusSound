import { describe, expect, it } from 'vitest';
import { getEnv } from './env';

const base = { DATABASE_URL: 'postgresql://x', AUTH_SECRET: 'a-long-enough-secret-value' };

describe('getEnv', () => {
  it('applies defaults', () => {
    const e = getEnv(base);
    expect(e.STORAGE_DRIVER).toBe('local');
    expect(e.WORKER_CONCURRENCY).toBe(2);
    expect(e.API_URL).toBe('http://localhost:8000');
  });
  it('names the bad variables', () => {
    expect(() => getEnv({ AUTH_SECRET: 'short' })).toThrow(/DATABASE_URL.*AUTH_SECRET|AUTH_SECRET.*DATABASE_URL/);
  });
  it('refuses the example secret in production', () => {
    expect(() => getEnv({ ...base, AUTH_SECRET: 'change-me-to-a-long-random-string', NODE_ENV: 'production' })).toThrow(/AUTH_SECRET/);
    expect(() => getEnv({ ...base, AUTH_SECRET: 'change-me-to-a-long-random-string' })).not.toThrow();
  });
});
