import { createHmac, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { db } from './db';
import { getEnv } from './env';
import { ApiError } from './http';

export const COOKIE = 'gs_session';
const SESSION_DAYS = 30;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10, 'Password must be at least 10 characters').max(200),
  name: z.string().trim().min(1).max(80).optional(),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

/** DB stores only an HMAC of the session token, so a database leak does not leak live sessions. */
export function tokenDigest(token: string, secret = getEnv().AUTH_SECRET): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.session.create({ data: { userId, token: tokenDigest(token), expiresAt: expires } });
  return { token, expires };
}

export async function setSessionCookie(token: string, expires: Date) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: getEnv().NODE_ENV === 'production', path: '/', expires,
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { token: tokenDigest(token) } });
  jar.delete(COOKIE);
}

export type SessionUser = { id: string; email: string; name: string | null; role: 'USER' | 'ADMIN' };

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { token: tokenDigest(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return { id: s.user.id, email: s.user.email, name: s.user.name, role: s.user.role };
});

/** For route handlers. */
export async function requireUser(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) throw new ApiError(401, 'Not signed in');
  return u;
}

/** For pages/layouts. */
export async function requireUserPage(): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect('/login');
  return u;
}
