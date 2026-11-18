import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok } from '@/lib/http';
import { getOwnedProject } from '@/lib/projects';

/** Queue Whisper auto-sync for the saved lyrics. */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const [audio, lyrics] = await Promise.all([
    db.audioUpload.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }),
    db.lyrics.findUnique({ where: { projectId: id }, select: { id: true } }),
  ]);
  if (!audio) throw new ApiError(422, 'Upload a song first');
  if (!lyrics) throw new ApiError(422, 'Save lyrics first');
  if (await db.job.findFirst({ where: { projectId: id, type: 'TRANSCRIPTION', status: { in: ['QUEUED', 'RUNNING'] } } })) throw new ApiError(409, 'Sync already running');
  const job = await db.job.create({ data: { projectId: id, type: 'TRANSCRIPTION', payload: { audioId: audio.id }, progressMessage: 'Queued' } });
  return ok({ job }, 201);
});
