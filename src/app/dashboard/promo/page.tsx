import Link from 'next/link';
import { PromoStudio } from '@/components/promo/PromoStudio';
import { Empty, PageHeader } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function PromoPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUserPage();
  const { project: pid } = await searchParams;
  const projects = await db.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true } });
  if (projects.length === 0) return <><PageHeader title="Promotional Clips" /><Empty title="No projects yet"><Link className="text-violet-300" href="/dashboard/projects">Create a project</Link> and upload a song first.</Empty></>;
  const current = projects.find((p) => p.id === pid) ?? projects[0];
  const analyzed = (await db.songAnalysis.count({ where: { projectId: current.id, status: 'COMPLETE' } })) > 0;
  return (
    <>
      <PageHeader title="Promotional Clips" subtitle="Vertical clips for TikTok, Reels and Shorts, cut from the best moments of your song."
        action={<form><select name="project" defaultValue={current.id} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" aria-label="Project">{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select> <button className="ml-2 px-3 py-2 rounded-lg bg-zinc-800 text-sm">Open</button></form>} />
      {analyzed ? <PromoStudio key={current.id} projectId={current.id} /> : <Empty title="Analyze a song first">Upload a song on the project page and wait for analysis to finish.</Empty>}
    </>
  );
}
