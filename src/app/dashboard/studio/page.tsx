import Link from 'next/link';
import { Check, Circle, Lock } from 'lucide-react';
import { Card, Empty, PageHeader, btn } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { db } from '@/lib/db';

type Step = { name: string; state: 'done' | 'ready' | 'later'; note?: string; href?: string };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUserPage();
  const { project: pid } = await searchParams;
  const projects = await db.project.findMany({ where: { userId: user.id, status: { not: 'ARCHIVED' } }, orderBy: { updatedAt: 'desc' }, take: 20 });
  const current = projects.find((p) => p.id === pid) ?? projects[0];
  let steps: Step[] = [];
  if (current) {
    const q = `?project=${current.id}`;
    const [audio, analysis, artists, treatments, scenes, generated, approved, finalRender, promos] = await Promise.all([
      db.audioUpload.count({ where: { projectId: current.id } }),
      db.songAnalysis.count({ where: { projectId: current.id, status: 'COMPLETE' } }),
      db.artistReference.count({ where: { userId: user.id } }),
      db.creativeTreatment.count({ where: { projectId: current.id } }),
      db.storyboardScene.count({ where: { storyboard: { projectId: current.id } } }),
      db.storyboardScene.count({ where: { storyboard: { projectId: current.id }, status: 'GENERATED' } }),
      db.storyboardScene.count({ where: { storyboard: { projectId: current.id }, status: { in: ['APPROVED', 'GENERATED'] } } }),
      db.renderJob.count({ where: { projectId: current.id, kind: 'FINAL', status: 'SUCCEEDED' } }),
      db.renderJob.count({ where: { projectId: current.id, kind: 'PROMO_CLIP', status: 'SUCCEEDED' } }),
    ]);
    const st = (done: boolean, ready: boolean): Step['state'] => (done ? 'done' : ready ? 'ready' : 'later');
    steps = [
      { name: 'Create a project', state: 'done' },
      { name: 'Upload a song', state: st(audio > 0, true), href: `/dashboard/projects/${current.id}` },
      { name: 'Upload artist reference images', state: st(artists > 0, true), href: '/dashboard/assets', note: 'Optional, keeps the artist consistent' },
      { name: 'Analyze the music', state: st(analysis > 0, audio > 0), href: `/dashboard/projects/${current.id}`, note: audio ? undefined : 'Needs a song' },
      { name: 'Generate creative concepts', state: st(treatments > 0, analysis > 0), href: `/dashboard/storyboards${q}`, note: analysis ? undefined : 'Needs analysis' },
      { name: 'Generate a scene-by-scene storyboard', state: st(scenes > 0, treatments > 0), href: `/dashboard/storyboards${q}`, note: treatments ? undefined : 'Needs a concept' },
      { name: 'Generate video scenes with AI', state: st(generated > 0, scenes > 0), href: `/dashboard/scenes${q}`, note: scenes ? 'Uses local ComfyUI if configured' : 'Needs a storyboard' },
      { name: 'Review and approve scenes', state: st(approved > 0, scenes > 0), href: `/dashboard/scenes${q}` },
      { name: 'Assemble and export the final video', state: st(finalRender > 0, generated > 0), href: `/dashboard/projects/${current.id}`, note: generated ? undefined : 'Needs generated scenes' },
      { name: 'Create TikTok, Reels and Shorts clips', state: st(promos > 0, analysis > 0), href: `/dashboard/promo${q}` },
    ];
  }
  return (
    <>
      <PageHeader title="AI Music Video Studio" subtitle="The full workflow, from song to finished video. Each step opens its screen; the next one to do is highlighted." />
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
                  {s.href && s.state !== 'later' && <Link href={s.href} className={btn.ghost + ' ml-auto'}>{s.state === 'done' ? 'Open' : 'Do this now'}</Link>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </>
  );
}
