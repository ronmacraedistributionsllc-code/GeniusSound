import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, notFound } from '@/lib/http';
import { getStorage } from '@/lib/storage';

/** Latest successfully generated clip for a scene. */
export const GET = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const gen = await db.sceneGeneration.findFirst({ where: { sceneId: id, status: 'SUCCEEDED', storageKey: { not: null }, scene: { storyboard: { project: { userId: user.id } } } }, orderBy: { createdAt: 'desc' } });
  if (!gen?.storageKey) throw notFound('Clip');
  const storage = getStorage();
  if (!(await storage.exists(gen.storageKey))) throw new ApiError(410, 'Clip file is missing from storage');
  const data = await storage.get(gen.storageKey);
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(data.length), 'Cache-Control': 'private, max-age=300' } });
});
