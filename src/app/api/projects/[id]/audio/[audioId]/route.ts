import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, notFound } from '@/lib/http';
import { getStorage } from '@/lib/storage';

type Ctx = { params: Promise<{ id: string; audioId: string }> };

/** Streams the uploaded song for the in-page player, with Range support so seeking works. */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id, audioId } = await params;
  const audio = await db.audioUpload.findFirst({ where: { id: audioId, projectId: id, project: { userId: user.id } } });
  if (!audio) throw notFound('Audio');
  const buf = await getStorage().get(audio.storageKey);
  const total = buf.length;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  const base = { 'Content-Type': audio.mimeType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600' };
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : total - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : total - 1;
    start = Math.max(0, start);
    end = Math.min(end, total - 1);
    if (start > end || start >= total) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    return new Response(new Uint8Array(buf.subarray(start, end + 1)), {
      status: 206, headers: { ...base, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(buf), { headers: { ...base, 'Content-Length': String(total) } });
});
