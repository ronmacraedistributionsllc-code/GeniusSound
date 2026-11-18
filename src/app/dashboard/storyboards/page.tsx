import Link from 'next/link';
import { StoryboardStudio } from '@/components/storyboard/StoryboardStudio';
import { Empty, PageHeader } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { db } from '@/lib/db';
import { PacingPanel } from '@/components/storyboard/PacingPanel';

export default async function StoryboardsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUserPage();
  const { project: pid } = await searchParams;
  const projects = await db.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true } });
  if (projects.length === 0) return <><PageHeader title="Storyboards" /><Empty title="No projects yet"><Link className="text-violet-300" href="/dashboard/projects">Create a project</Link> and upload a song first.</Empty></>;
  const current = projects.find((p) => p.id === pid) ?? projects[0];
  const analyzed = (await db.songAnalysis.count({ where: { projectId: current.id, status: 'COMPLETE' } })) > 0;
  return (
    <>
      <PageHeader title="Storyboards" subtitle="Concepts from the AI creative director, then a scene-by-scene storyboard you control."
        action={<form><select name="project" defaultValue={current.id} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" aria-label="Project">{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select> <button className="ml-2 px-3 py-2 rounded-lg bg-zinc-800 text-sm">Open</button></form>} />
      <StoryboardStudio key={current.id} projectId={current.id} ready={analyzed} />
      <PacingPanel projectId={current.id} userId={user.id} />
    </>
  );
}
