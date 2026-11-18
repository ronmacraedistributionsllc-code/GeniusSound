import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, notFound, ok } from '@/lib/http';

export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const job = await db.job.findFirst({ where: { id, project: { userId: user.id } } });
  if (!job) throw notFound('Job');
  // Atomic: only a job that is still queued/running can be cancelled. A running worker notices before saving results.
  const r = await db.job.updateMany({
    where: { id, status: { in: ['QUEUED', 'RUNNING'] } },
    data: { status: 'CANCELLED', finishedAt: new Date(), progressMessage: 'Cancelled by user' },
  });
  if (r.count === 0) throw new ApiError(409, `Job already ${job.status.toLowerCase()}`);
  if (job.type === 'SONG_ANALYSIS') {
    const analysisId = (job.payload as { analysisId?: string })?.analysisId;
    if (analysisId) await db.songAnalysis.updateMany({ where: { id: analysisId, status: { in: ['PENDING', 'RUNNING'] } }, data: { status: 'FAILED', error: 'Cancelled' } });
    if (job.projectId) await db.project.updateMany({ where: { id: job.projectId, status: 'ANALYZING' }, data: { status: 'DRAFT' } });
  }
  if (job.type === 'RENDER_ASSEMBLY') {
    const renderId = (job.payload as { renderId?: string })?.renderId;
    if (renderId) await db.renderJob.updateMany({ where: { id: renderId, status: { in: ['QUEUED', 'RUNNING'] } }, data: { status: 'CANCELLED', finishedAt: new Date() } });
  }
  return ok({ ok: true });
});
