import Link from 'next/link';
import { Card, Empty, PageHeader, StatusBadge, btn } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function DashboardPage() {
  const user = await requireUserPage();
  const mine = { userId: user.id };
  const [projects, analyzed, activeJobs, failedJobs, recent, jobs] = await Promise.all([
    db.project.count({ where: { ...mine, status: { not: 'ARCHIVED' } } }),
    db.songAnalysis.count({ where: { project: mine, status: 'COMPLETE' } }),
    db.job.count({ where: { project: mine, status: { in: ['QUEUED', 'RUNNING'] } } }),
    db.job.count({ where: { project: mine, status: 'FAILED' } }),
    db.project.findMany({ where: { ...mine, status: { not: 'ARCHIVED' } }, orderBy: { updatedAt: 'desc' }, take: 5 }),
    db.job.findMany({ where: { project: mine }, orderBy: { createdAt: 'desc' }, take: 5, include: { project: { select: { title: true } } } }),
  ]);
  const stats: [string, number, string][] = [['Projects', projects, '/dashboard/projects'], ['Songs analyzed', analyzed, '/dashboard/analysis'], ['Jobs running', activeJobs, '/dashboard/queue'], ['Failed jobs', failedJobs, '/dashboard/queue']];
  return (
    <>
      <PageHeader title={`Welcome${user.name ? `, ${user.name}` : ''}`} subtitle="Your studio at a glance."
        action={<Link href="/dashboard/projects" className={btn.primary}>New project</Link>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(([label, n, href]) => (
          <Link key={label} href={href}><Card className="hover:border-violet-700 transition"><p className="text-sm text-zinc-500">{label}</p><p className="text-3xl font-bold mt-1">{n}</p></Card></Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold mb-3">Recent projects</h2>
          {recent.length === 0 ? <Empty title="No projects yet">Create one to upload and analyze a song.</Empty> : (
            <ul className="divide-y divide-zinc-800">
              {recent.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <Link href={`/dashboard/projects/${p.id}`} className="hover:text-violet-300 truncate">{p.title}</Link><StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Recent jobs</h2>
          {jobs.length === 0 ? <Empty title="No jobs yet">Jobs appear here when you analyze, generate or render.</Empty> : (
            <ul className="divide-y divide-zinc-800">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="truncate">{j.type.replaceAll('_', ' ').toLowerCase()} · <span className="text-zinc-500">{j.project?.title}</span></span><StatusBadge status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
