import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok } from '@/lib/http';

export const GET = handle(async (req) => {
  const user = await requireUser();
  const status = new URL(req.url).searchParams.get('status');
  const jobs = await db.job.findMany({
    where: { project: { userId: user.id }, ...(status ? { status: status as never } : {}) },
    orderBy: { createdAt: 'desc' }, take: 100,
    include: { project: { select: { id: true, title: true } } },
  });
  return ok({ jobs });
});
