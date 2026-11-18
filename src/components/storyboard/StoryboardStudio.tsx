'use client';

import { useCallback, useEffect, useState } from 'react';
import { btn, Card, Empty, input, StatusBadge } from '@/components/ui/ui';
import { api, fmtTime } from '@/lib/client';

type Treatment = { id: string; title: string; logline: string | null; mood: string | null; visualStyle: string | null; palette: string | null; selected: boolean; directorNotes: { treatment?: string } | null };
type Scene = { id: string; order: number; number: number; title: string; description: string; sectionLabel: string | null; lyricText: string | null; startSec: number; durationSec: number; location: string | null; cameraAngle: string | null; cameraMove: string | null; lighting: string | null; transition: string | null; status: string; locked: boolean };
type Board = { id: string; title: string; scenes: Scene[] } | null;

export function StoryboardStudio({ projectId, ready }: { projectId: string; ready: boolean }) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [board, setBoard] = useState<Board>(null);
  const [instr, setInstr] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Scene>>({});

  const load = useCallback(async () => {
    const [t, b] = await Promise.all([api<{ treatments: Treatment[] }>(`/api/projects/${projectId}/concepts`), api<{ storyboard: Board }>(`/api/projects/${projectId}/storyboard`)]);
    setTreatments(t.treatments); setBoard(b.storyboard);
  }, [projectId]);
  useEffect(() => { const t = setTimeout(() => { load().catch((e) => setError(e.message)); }, 0); return () => clearTimeout(t); }, [load]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError('');
    try { await fn(); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  const scene = (id: string, body: object) => run('scene', () => api(`/api/scenes/${id}`, { method: 'PATCH', body: body as never }));

  if (!ready) return <Empty title="Analyze a song first">Upload a song on the project page and wait for analysis to finish.</Empty>;
  const selected = treatments.find((t) => t.selected);
  const total = board?.scenes.reduce((n, s) => n + s.durationSec, 0) ?? 0;
  return (
    <div className="space-y-8">
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <Card className="space-y-3">
        <h2 className="font-semibold">1 · Concepts</h2>
        <textarea aria-label="Director notes" className={`${input} h-20`} placeholder="Director notes (optional): mood, locations, story, things to avoid…" value={instr} onChange={(e) => setInstr(e.target.value)} />
        <button className={btn.primary} disabled={!!busy} onClick={() => run('concepts', () => api(`/api/projects/${projectId}/concepts`, { method: 'POST', body: { instructions: instr, count: 3 } as never }))}>{busy === 'concepts' ? 'Writing concepts… (can take a minute)' : 'Generate 3 concepts'}</button>
        <p className="text-xs text-zinc-500">Needs an LLM configured on the media service (LLM_BASE_URL + LLM_MODEL, e.g. a local Ollama/LM Studio, or OPENAI_API_KEY).</p>
        <div className="grid md:grid-cols-3 gap-4">
          {treatments.map((t) => (
            <div key={t.id} className={`rounded-xl border p-4 space-y-2 ${t.selected ? 'border-violet-500 bg-violet-950/20' : 'border-zinc-800'}`}>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-zinc-300">{t.logline}</p>
              <p className="text-xs text-zinc-500">{t.mood} · {t.visualStyle}</p>
              <p className="text-xs text-zinc-500">{t.palette}</p>
              <details className="text-xs text-zinc-400"><summary className="cursor-pointer">Treatment</summary><p className="whitespace-pre-line mt-1">{t.directorNotes?.treatment}</p></details>
              <button className={t.selected ? btn.ghost : btn.primary} disabled={!!busy || t.selected} onClick={() => run('select', () => api(`/api/treatments/${t.id}/select`, { method: 'POST' }))}>{t.selected ? 'Selected' : 'Use this concept'}</button>
            </div>))}
        </div>
      </Card>
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold">2 · Storyboard{board ? ` — ${board.scenes.length} scenes, ${fmtTime(total)}` : ''}</h2>
          <button className={btn.primary} disabled={!!busy || !selected} onClick={() => run('board', () => api(`/api/projects/${projectId}/storyboard`, { method: 'POST', body: { instructions: instr } as never }))}>{busy === 'board' ? 'Writing storyboard…' : board ? 'Regenerate' : 'Generate storyboard'}</button>
        </div>
        {!selected && <p className="text-xs text-zinc-500">Pick a concept above first.</p>}
        {board?.scenes.map((s, i) => (
          <div key={s.id} className="rounded-lg border border-zinc-800 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{s.number}. {s.title} <span className="text-zinc-500 text-xs">{fmtTime(s.startSec)} · {s.durationSec.toFixed(1)}s</span></span>
              <span className="flex items-center gap-2"><StatusBadge status={s.status === 'DRAFT' ? 'PENDING' : s.status} />{s.locked && <span className="text-xs text-amber-300">locked</span>}</span>
            </div>
            {editing === s.id ? (
              <div className="space-y-2">
                {(['description', 'location', 'cameraAngle', 'cameraMove', 'lighting'] as const).map((f) => (
                  f === 'description'
                    ? <textarea key={f} aria-label={f} className={`${input} h-24`} value={draft[f] ?? ''} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />
                    : <input key={f} aria-label={f} className={input} placeholder={f} value={(draft[f] as string) ?? ''} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />))}
                <div className="flex gap-2"><button className={btn.primary} disabled={!!busy} onClick={async () => { await scene(s.id, { action: 'edit', ...Object.fromEntries(Object.entries(draft).filter(([, v]) => v)) }); setEditing(null); }}>Save</button><button className={btn.ghost} onClick={() => setEditing(null)}>Cancel</button></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-zinc-300 whitespace-pre-line">{s.description}</p>
                <p className="text-xs text-zinc-500">{[s.location, s.cameraAngle, s.cameraMove, s.lighting].filter(Boolean).join(' · ')}</p>
                {s.lyricText && <p className="text-xs italic text-zinc-400">“{s.lyricText}”</p>}
              </>)}
            <div className="flex flex-wrap gap-2 pt-1">
              <button className={btn.ghost} disabled={!!busy || s.locked} onClick={() => { setEditing(s.id); setDraft({ description: s.description, location: s.location ?? '', cameraAngle: s.cameraAngle ?? '', cameraMove: s.cameraMove ?? '', lighting: s.lighting ?? '' }); }}>Edit</button>
              <button className={btn.ghost} disabled={!!busy || s.locked || s.status === 'APPROVED'} onClick={() => scene(s.id, { action: 'approve' })}>Approve</button>
              <button className={btn.ghost} disabled={!!busy || s.locked} onClick={() => scene(s.id, { action: 'reject' })}>Reject</button>
              <button className={btn.ghost} disabled={!!busy} onClick={() => scene(s.id, { action: s.locked ? 'unlock' : 'lock' })}>{s.locked ? 'Unlock' : 'Lock'}</button>
              <button className={btn.ghost} disabled={!!busy || s.locked || i === 0} aria-label="Move up" onClick={() => scene(s.id, { action: 'move', direction: 'up' })}>↑</button>
              <button className={btn.ghost} disabled={!!busy || s.locked || i === board.scenes.length - 1} aria-label="Move down" onClick={() => scene(s.id, { action: 'move', direction: 'down' })}>↓</button>
              <button className={btn.danger} disabled={!!busy || s.locked} onClick={() => { if (confirm('Delete this scene?')) run('scene', () => api(`/api/scenes/${s.id}`, { method: 'DELETE' })); }}>Delete</button>
            </div>
          </div>))}
      </Card>
    </div>
  );
}
