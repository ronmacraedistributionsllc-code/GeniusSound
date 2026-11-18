import { db } from '@/lib/db';
import { mediaApi } from '@/lib/media-api';

/** Pacing check of the latest storyboard against the song's sections. Origin: see third_party/openmontage/NOTICE.md. */
export async function PacingPanel({ projectId, userId }: { projectId: string; userId: string }) {
  const sb = await db.storyboard.findFirst({
    where: { projectId, project: { userId } }, orderBy: { createdAt: 'desc' },
    include: { scenes: { orderBy: { order: 'asc' } } },
  });
  if (!sb || sb.scenes.length === 0) return null;
  const a = await db.songAnalysis.findFirst({ where: { projectId, status: 'COMPLETE' }, orderBy: { createdAt: 'desc' }, include: { sections: { orderBy: { order: 'asc' } } } });
  let result: Awaited<ReturnType<typeof mediaApi.pacingCheck>> | null = null;
  let error: string | null = null;
  try {
    result = await mediaApi.pacingCheck({
      scenes: sb.scenes.map((s) => ({ start: s.startSec, end: s.startSec + s.durationSec })),
      sections: (a?.sections ?? []).map((s) => ({ start: s.startSec, label: s.label })),
    });
  } catch (e) { error = (e as Error).message; }
  return (
    <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4" aria-label="Pacing check">
      <h2 className="text-sm font-semibold">Pacing check</h2>
      {error && <p className="text-sm text-amber-300 mt-2">Could not run the check: {error}</p>}
      {result && (result.ok
        ? <p className="text-sm text-emerald-300 mt-2">{result.stats.scenes} scenes, avg {result.stats.avg_scene_sec}s. Cuts line up with the song sections.</p>
        : <ul className="mt-2 space-y-1 text-sm text-zinc-300">{result.issues.map((i, n) => <li key={n}><span className="text-amber-300">{i.type.replace('_', ' ')}</span>{i.scene != null ? ` (scene ${i.scene + 1})` : i.section ? ` (${i.section})` : ''}: {i.detail}</li>)}</ul>)}
      {result && !result.variation.ok && <p className="text-xs text-zinc-400 mt-2">{result.variation.issues.length} consecutive scenes repeat the same shot size and camera move.</p>}
    </section>
  );
}
