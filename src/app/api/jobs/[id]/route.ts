import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, notFound, ok } from '@/lib/http';

export const GET = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const job = await db.job.findFirst({ where: { id, project: { userId: user.id } } });
  if (!job) throw notFound('Job');
  return ok({ job });
});
