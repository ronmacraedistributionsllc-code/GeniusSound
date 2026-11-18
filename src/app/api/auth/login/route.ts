import { createSession, loginSchema, setSessionCookie, verifyPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';

// bcrypt hash of a random string: compared when the email is unknown so timing doesn't reveal which emails exist.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO5pQnR2X6qCw7dPzv6n3mS9uYf3b0l7i';

export const POST = handle(async (req) => {
  const input = await parseJson(req, loginSchema);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (!rateLimit(`login:${ip}:${input.email}`, 8, 15 * 60_000)) throw new ApiError(429, 'Too many attempts. Try again in a few minutes.');
  const user = await db.user.findUnique({ where: { email: input.email } });
  const good = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !good) throw new ApiError(401, 'Incorrect email or password');
  const { token, expires } = await createSession(user.id);
  await setSessionCookie(token, expires);
  return ok({ user: { id: user.id, email: user.email, name: user.name } });
});
