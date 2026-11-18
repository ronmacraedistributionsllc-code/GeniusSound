import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, notFound, ok } from '@/lib/http';

export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const t = await db.creativeTreatment.findFirst({ where: { id, project: { userId: user.id } } });
  if (!t) throw notFound('Concept');
  await db.$transaction([
    db.creativeTreatment.updateMany({ where: { projectId: t.projectId }, data: { selected: false } }),
    db.creativeTreatment.update({ where: { id }, data: { selected: true } }),
    db.project.updateMany({ where: { id: t.projectId, status: { in: ['DRAFT', 'CONCEPTING'] } }, data: { status: 'STORYBOARDING' } }),
  ]);
  return ok({ ok: true });
});
