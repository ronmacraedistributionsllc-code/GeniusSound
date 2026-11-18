import Link from 'next/link';
import { Check, Circle, Lock } from 'lucide-react';
import { Card, Empty, PageHeader, btn } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { db } from '@/lib/db';

type Step = { name: string; state: 'done' | 'ready' | 'later'; note?: string };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUserPage();
  const { project: pid } = await searchParams;
  const projects = await db.project.findMany({ where: { userId: user.id, status: { not: 'ARCHIVED' } }, orderBy: { updatedAt: 'desc' }, take: 20 });
  const current = projects.find((p) => p.id === pid) ?? projects[0];
  let steps: Step[] = [];
  if (current) {
    const [audio, analysis] = await Promise.all([
      db.audioUpload.count({ where: { projectId: current.id } }),
      db.songAnalysis.count({ where: { projectId: current.id, status: 'COMPLETE' } }),
    ]);
    steps = [
      { name: 'Create a project', state: 'done' },
      { name: 'Upload a song', state: audio ? 'done' : 'ready' },
      { name: 'Upload artist reference images', state: 'later', note: 'Not built yet (identity tools)' },
      { name: 'Analyze the music', state: analysis ? 'done' : audio ? 'ready' : 'later', note: audio ? undefined : 'Needs a song' },
      { name: 'Generate creative concepts', state: 'later', note: 'Engine built; screen not wired yet' },
      { name: 'Generate a scene-by-scene storyboard', state: 'later', note: 'Engine built; screen not wired yet' },
      { name: 'Generate video scenes with AI', state: 'later', note: 'Needs a configured provider (ComfyUI, Replicate or fal)' },
      { name: 'Review and approve scenes', state: 'later', note: 'Rules built; screen not wired yet' },
      { name: 'Assemble the music video', state: 'later', note: 'Engine built; screen not wired yet' },
      { name: 'Export the final video', state: 'later', note: 'Engine built; screen not wired yet' },
      { name: 'Create TikTok, Reels and Shorts clips', state: 'later', note: 'Engine built; screen not wired yet' },
    ];
  }
  return (
    <>
      <PageHeader title="AI Music Video Studio" subtitle="The full workflow, from song to finished video. Steps that aren't built yet are marked." />
      {!current ? (
        <Empty title="Start with a project"><Link href="/dashboard/projects" className={btn.primary + ' mt-3'}>Create a project</Link></Empty>
      ) : (
        <div className="space-y-4">
          <form className="flex items-center gap-2 text-sm" method="get">
            <label htmlFor="project" className="text-zinc-400">Project</label>
            <select id="project" name="project" defaultValue={current.id} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2">
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button className={btn.ghost}>Switch</button>
            <Link href={`/dashboard/projects/${current.id}`} className={btn.primary + ' ml-auto'}>Open project</Link>
          </form>
          <Card>
            <ol className="divide-y divide-zinc-800">
              {steps.map((s, i) => (
                <li key={s.name} className="flex items-center gap-3 py-3">
                  {s.state === 'done' ? <Check className="w-5 h-5 text-emerald-400" /> : s.state === 'ready' ? <Circle className="w-5 h-5 text-violet-400" /> : <Lock className="w-4 h-4 text-zinc-600 ml-0.5" />}
                  <span className={s.state === 'later' ? 'text-zinc-500' : ''}>{i + 1}. {s.name}</span>
                  {s.note && <span className="ml-auto text-xs text-zinc-600">{s.note}</span>}
                  {s.state === 'ready' && <Link href={`/dashboard/projects/${current.id}`} className={btn.ghost + ' ml-auto'}>Do this now</Link>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </>
  );
}
