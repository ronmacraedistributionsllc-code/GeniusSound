import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, notFound } from '@/lib/http';
import { getStorage } from '@/lib/storage';

export const GET = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const img = await db.referenceImage.findFirst({ where: { artistRefId: id, artistRef: { userId: user.id } } });
  if (!img) throw notFound('Image');
  const data = await getStorage().get(img.storageKey);
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': img.mimeType, 'Cache-Control': 'private, max-age=300' } });
});
