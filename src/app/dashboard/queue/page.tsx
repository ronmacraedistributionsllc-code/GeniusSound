import { PageHeader } from '@/components/ui/ui';
import { JobsTable } from '@/components/queue/JobsTable';
import { requireUserPage } from '@/lib/auth';
import { plain } from '@/lib/client';
import { db } from '@/lib/db';

export default async function QueuePage() {
  const user = await requireUserPage();
  const jobs = await db.job.findMany({ where: { project: { userId: user.id } }, orderBy: { createdAt: 'desc' }, take: 100, include: { project: { select: { id: true, title: true } } } });
  return (
    <>
      <PageHeader title="Render Queue" subtitle="Background jobs with live progress. Jobs run in the worker (npm run worker), never inside a web request." />
      <JobsTable initial={plain(jobs.map((j) => ({ id: j.id, type: j.type, status: j.status, progress: j.progress, progressMessage: j.progressMessage, error: j.error, attempts: j.attempts, maxAttempts: j.maxAttempts, createdAt: j.createdAt, project: j.project })))} />
    </>
  );
}
