import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, notFound, ok } from '@/lib/http';

export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const job = await db.job.findFirst({ where: { id, project: { userId: user.id } } });
  if (!job) throw notFound('Job');
  if (!['FAILED', 'CANCELLED'].includes(job.status)) throw new ApiError(409, 'Only failed or cancelled jobs can be retried');
  if (job.type === 'SONG_ANALYSIS') {
    const p = job.payload as { audioId?: string; analysisId?: string };
    if (p.analysisId) await db.songAnalysis.updateMany({ where: { id: p.analysisId }, data: { status: 'PENDING', error: null } });
    if (job.projectId) await db.project.updateMany({ where: { id: job.projectId }, data: { status: 'ANALYZING' } });
  }
  if (job.type === 'RENDER_ASSEMBLY') {
    const renderId = (job.payload as { renderId?: string }).renderId;
    if (renderId) await db.renderJob.updateMany({ where: { id: renderId }, data: { status: 'QUEUED', error: null, progress: 0, finishedAt: null } });
  }
  await db.job.update({ where: { id }, data: { status: 'QUEUED', attempts: 0, error: null, progress: 0, progressMessage: 'Queued (retry)', runAt: new Date(), startedAt: null, finishedAt: null } });
  return ok({ ok: true });
});
