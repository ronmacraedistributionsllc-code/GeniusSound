import { z } from 'zod';
import { getSessionUser, requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok, parseJson } from '@/lib/http';

export const GET = handle(async () => ok({ user: await getSessionUser() }));

const Patch = z.object({ name: z.string().trim().min(1).max(80) });

/** Edit profile (display name). Email is the login identity and is not editable here. */
export const PATCH = handle(async (req) => {
  const user = await requireUser();
  const { name } = await parseJson(req, Patch);
  const updated = await db.user.update({ where: { id: user.id }, data: { name }, select: { id: true, email: true, name: true, role: true } });
  return ok({ user: updated });
});
