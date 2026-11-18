import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok } from '@/lib/http';
import { getOwnedProject } from '@/lib/projects';

export const GET = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const analysis = await db.songAnalysis.findFirst({
    where: { projectId: id }, orderBy: { createdAt: 'desc' }, include: { sections: { orderBy: { order: 'asc' } } },
  });
  const job = await db.job.findFirst({ where: { projectId: id, type: 'SONG_ANALYSIS' }, orderBy: { createdAt: 'desc' } });
  return ok({ analysis, job });
});
