'use client';

import { useCallback, useEffect, useState } from 'react';
import { btn, Card, input, StatusBadge } from '@/components/ui/ui';
import { api, fmtBytes } from '@/lib/client';

type Render = { id: string; kind: string; status: string; error: string | null; preset: string | null; sizeBytes: number | null; createdAt: string; outputs: { id: string }[] };

export function FinalExport({ projectId }: { projectId: string }) {
  const [renders, setRenders] = useState<Render[]>([]);
  const [o, setO] = useState({ aspect: '16:9', quality: '1080p', transition: 'none', preview: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setRenders((await api<{ renders: Render[] }>(`/api/projects/${projectId}/renders`)).renders.filter((r) => r.kind !== 'LYRIC_VIDEO')); } catch { /* keep */ } }, [projectId]);
  useEffect(() => { const t0 = setTimeout(load, 0); const t = setInterval(load, 3000); return () => { clearTimeout(t0); clearInterval(t); }; }, [load]);
  async function start() {
    setBusy(true); setError('');
    try { await api(`/api/projects/${projectId}/renders`, { method: 'POST', body: { kind: 'FINAL', ...o } as never }); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Export video</h2>
      <p className="text-xs text-zinc-500">Joins every scene&apos;s generated clip, in storyboard order, with the song. All scenes need a generated clip. Short clips hold their last frame to stay in sync.</p>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm text-zinc-400">Aspect<select className={`${input} mt-1`} value={o.aspect} onChange={(e) => setO({ ...o, aspect: e.target.value })}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
        <label className="text-sm text-zinc-400">Quality<select className={`${input} mt-1`} value={o.quality} onChange={(e) => setO({ ...o, quality: e.target.value })}><option>1080p</option><option>4k</option></select></label>
        <label className="text-sm text-zinc-400">Transition<select className={`${input} mt-1`} value={o.transition} onChange={(e) => setO({ ...o, transition: e.target.value })}><option value="none">Hard cut (keeps sync)</option><option>fade</option><option>fadeblack</option><option>dissolve</option></select></label>
      </div>
      {o.transition !== 'none' && <p className="text-xs text-amber-300">Crossfades overlap clips, so the video gets slightly shorter than the song.</p>}
      <label className="flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={o.preview} onChange={(e) => setO({ ...o, preview: e.target.checked })} /> Fast half-resolution preview</label>
      <button className={btn.primary} disabled={busy} onClick={start}>Export</button>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <ul className="space-y-2">{renders.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-zinc-400">{r.kind.toLowerCase()} · {r.preset} · {new Date(r.createdAt).toLocaleString()}</span>
          <span className="flex items-center gap-3"><StatusBadge status={r.status} />
            {r.status === 'SUCCEEDED' && r.outputs[0] && <a className="text-violet-300 hover:underline" href={`/api/renders/${r.id}/download`}>Download{r.sizeBytes ? ` (${fmtBytes(r.sizeBytes)})` : ''}</a>}
            {r.status === 'FAILED' && <span className="text-xs text-red-400 max-w-56 truncate" title={r.error ?? ''}>{r.error}</span>}</span></li>))}</ul>
    </Card>
  );
}
