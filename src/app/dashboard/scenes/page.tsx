import Link from 'next/link';
import { SceneGenerator } from '@/components/scenes/SceneGenerator';
import { Empty, PageHeader } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { db } from '@/lib/db';

export default async function ScenesPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUserPage();
  const { project: pid } = await searchParams;
  const projects = await db.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true } });
  if (projects.length === 0) return <><PageHeader title="AI Scene Generator" /><Empty title="No projects yet"><Link className="text-violet-300" href="/dashboard/projects">Create a project</Link> first.</Empty></>;
  const current = projects.find((p) => p.id === pid) ?? projects[0];
  return (
    <>
      <PageHeader title="AI Scene Generator" subtitle="Generate a real clip for each storyboard scene with ComfyUI, Replicate or fal. Nothing is faked: failures are shown as failures."
        action={<form><select name="project" defaultValue={current.id} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" aria-label="Project">{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select> <button className="ml-2 px-3 py-2 rounded-lg bg-zinc-800 text-sm">Open</button></form>} />
      <SceneGenerator key={current.id} projectId={current.id} />
    </>
  );
}
