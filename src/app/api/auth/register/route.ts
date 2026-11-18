import { createSession, hashPassword, registerSchema, setSessionCookie } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

export const POST = handle(async (req) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!rateLimit(`register:${ip}`, 10, 3600_000)) throw new ApiError(429, 'Too many sign-up attempts. Try again later.');
  const input = await parseJson(req, registerSchema);
  if (await db.user.findUnique({ where: { email: input.email } })) throw new ApiError(409, 'An account with this email already exists');
  // First account on a fresh install becomes the admin.
  const first = (await db.user.count()) === 0;
  const user = await db.user.create({
    data: { email: input.email, name: input.name ?? null, passwordHash: await hashPassword(input.password), role: first ? 'ADMIN' : 'USER' },
  });
  const { token, expires } = await createSession(user.id);
  await setSessionCookie(token, expires);
  return ok({ user: { id: user.id, email: user.email, name: user.name } }, 201);
});
