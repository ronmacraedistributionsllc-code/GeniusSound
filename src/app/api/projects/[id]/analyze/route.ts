import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok } from '@/lib/http';
import { createAnalysisJob, getOwnedProject } from '@/lib/projects';

/** Re-run analysis on the project's most recent audio upload. */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const audio = await db.audioUpload.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } });
  if (!audio) throw new ApiError(422, 'Upload a song first');
  const { job } = await createAnalysisJob(db, id, audio.id, audio.durationSec);
  return ok({ job }, 201);
});
