import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, notFound } from '@/lib/http';
import { getStorage } from '@/lib/storage';

export const GET = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const out = await db.renderOutput.findFirst({ where: { renderJobId: id, renderJob: { project: { userId: user.id } } } });
  if (!out) throw notFound('Render output');
  const storage = getStorage();
  if (!(await storage.exists(out.storageKey))) throw new ApiError(410, 'Render file is missing from storage');
  const data = await storage.get(out.storageKey);
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': out.mimeType, 'Content-Length': String(data.length), 'Content-Disposition': `attachment; filename="lyric-video-${id}.mp4"` } });
});
