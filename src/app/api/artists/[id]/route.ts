import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, notFound, ok } from '@/lib/http';
import { getStorage } from '@/lib/storage';

export const DELETE = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const a = await db.artistReference.findFirst({ where: { id, userId: user.id }, include: { images: true } });
  if (!a) throw notFound('Artist');
  await db.artistReference.delete({ where: { id } });
  for (const img of a.images) await getStorage().delete(img.storageKey).catch(() => undefined);
  return ok({ ok: true });
});
