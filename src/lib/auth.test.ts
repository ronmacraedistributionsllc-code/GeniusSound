import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { hashPassword, loginSchema, registerSchema, tokenDigest, verifyPassword } from './auth';

describe('auth helpers', () => {
  it('hashes and verifies passwords', async () => {
    const h = await hashPassword('correct horse battery');
    expect(h).not.toContain('correct');
    expect(await verifyPassword('correct horse battery', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
  it('session digest is deterministic, secret-dependent and not the token', () => {
    const a = tokenDigest('tok', 'secret-one-1234567'), b = tokenDigest('tok', 'secret-one-1234567');
    expect(a).toBe(b);
    expect(a).not.toBe(tokenDigest('tok', 'secret-two-1234567'));
    expect(a).not.toContain('tok');
    expect(a).toHaveLength(64);
  });
  it('validates registration input', () => {
    expect(registerSchema.parse({ email: ' A@B.com ', password: '0123456789' }).email).toBe('a@b.com');
    expect(registerSchema.safeParse({ email: 'nope', password: '0123456789' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.com', password: 'short' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
  });
});
