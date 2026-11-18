import Link from 'next/link';
import { LyricsStudio } from '@/components/lyrics/LyricsStudio';
import { Empty, PageHeader } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { plain } from '@/lib/client';
import { db } from '@/lib/db';

export default async function LyricsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {
  const user = await requireUserPage();
  const { project: pid } = await searchParams;
  const projects = await db.project.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true } });
  if (projects.length === 0) return <><PageHeader title="Lyric Video Creator" /><Empty title="No projects yet"><Link className="text-violet-300" href="/dashboard/projects">Create a project</Link> and upload a song first.</Empty></>;
  const current = projects.find((p) => p.id === pid) ?? projects[0];
  const [audio, lyrics] = await Promise.all([
    db.audioUpload.findFirst({ where: { projectId: current.id, durationSec: { not: null } } }),
    db.lyrics.findUnique({ where: { projectId: current.id }, include: { lines: { orderBy: { order: 'asc' } } } }),
  ]);
  return (
    <>
      <PageHeader title="Lyric Video Creator" subtitle="Paste lyrics, sync them to the song, pick a style and render a real video."
        action={<form><select name="project" defaultValue={current.id} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm" aria-label="Project">{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select> <button className="ml-2 px-3 py-2 rounded-lg bg-zinc-800 text-sm">Open</button></form>} />
      <LyricsStudio key={current.id} projectId={current.id} hasAudio={!!audio}
        initial={lyrics ? plain({ id: lyrics.id, source: lyrics.source, lines: lyrics.lines.map((l) => ({ id: l.id, order: l.order, text: l.text, startSec: l.startSec, endSec: l.endSec })) }) : null}
        initialText={lyrics?.lines.map((l) => l.text).join('\n') ?? ''} />
    </>
  );
}
