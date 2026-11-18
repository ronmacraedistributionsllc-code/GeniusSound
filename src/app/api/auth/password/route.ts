import { cookies } from 'next/headers';
import { z } from 'zod';
import { COOKIE, hashPassword, requireUser, tokenDigest, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({ current: z.string().min(1).max(200), next: z.string().min(10, 'Password must be at least 10 characters').max(200) });

/** Change password: needs the current one; every OTHER session is signed out, this one stays. */
export const POST = handle(async (req) => {
  const user = await requireUser();
  if (!rateLimit(`pw:${user.id}`, 5, 15 * 60_000)) throw new ApiError(429, 'Too many attempts. Try again in a few minutes.');
  const { current, next } = await parseJson(req, Body);
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, row.passwordHash))) throw new ApiError(400, 'Current password is incorrect');
  if (current === next) throw new ApiError(400, 'New password must differ from the current one');
  const token = (await cookies()).get(COOKIE)?.value;
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } }),
    db.session.deleteMany({ where: { userId: user.id, ...(token ? { token: { not: tokenDigest(token) } } : {}) } }),
  ]);
  return ok({ ok: true });
});
