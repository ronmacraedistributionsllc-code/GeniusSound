'use client';

import { useCallback, useEffect, useState } from 'react';
import { btn, Card, input, StatusBadge } from '@/components/ui/ui';
import { api, fmtBytes, fmtTime } from '@/lib/client';

type Suggestion = { start: number; end: number; duration: number; score: number; reasons: string[] };
type Render = { id: string; kind: string; status: string; error: string | null; sizeBytes: number | null; createdAt: string; options: { start?: number; clipSeconds?: number } | null; outputs: { id: string }[] };

export function PromoStudio({ projectId }: { projectId: string }) {
  const [duration, setDuration] = useState(15);
  const [platform, setPlatform] = useState('TIKTOK');
  const [clips, setClips] = useState<Suggestion[]>([]);
  const [renders, setRenders] = useState<Render[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadRenders = useCallback(async () => { try { setRenders((await api<{ renders: Render[] }>(`/api/projects/${projectId}/renders`)).renders.filter((r) => r.kind === 'PROMO_CLIP')); } catch { /* keep */ } }, [projectId]);
  useEffect(() => { const t0 = setTimeout(loadRenders, 0); const t = setInterval(loadRenders, 3000); return () => { clearTimeout(t0); clearInterval(t); }; }, [loadRenders]);

  async function suggest() {
    setBusy(true); setError('');
    try { setClips((await api<{ clips: Suggestion[] }>(`/api/projects/${projectId}/promos?duration=${duration}&platform=${platform}&count=3`)).clips); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function render(c: Suggestion) {
    setError('');
    try { await api(`/api/projects/${projectId}/promos`, { method: 'POST', body: { start: c.start, duration: c.duration } as never }); await loadRenders(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-sm text-zinc-400">Length<select className={`${input} mt-1`} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>{[10, 15, 30, 45, 60].map((d) => <option key={d} value={d}>{d}s</option>)}</select></label>
          <label className="text-sm text-zinc-400">Platform<select className={`${input} mt-1`} value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="TIKTOK">TikTok</option><option value="INSTAGRAM_REELS">Instagram Reels</option><option value="YOUTUBE_SHORTS">YouTube Shorts</option></select></label>
          <button className={btn.primary} onClick={suggest} disabled={busy}>Find best moments</button>
        </div>
        <p className="text-xs text-zinc-500">Picked from the real analysis: energy, beat drops and choruses, snapped to the beat. Clips are 9:16 with word-synced lyrics when lyrics are saved, otherwise audio over a plain background.</p>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <ul className="space-y-2">{clips.map((c) => (
          <li key={c.start} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 p-3 text-sm">
            <span>{fmtTime(c.start)} – {fmtTime(c.end)} <span className="text-zinc-500">· {c.reasons.join(', ')}</span></span>
            <button className={btn.ghost} onClick={() => render(c)}>Render clip</button></li>))}</ul>
      </Card>
      <Card>
        <h2 className="font-semibold mb-3">Rendered clips</h2>
        {renders.length === 0 ? <p className="text-sm text-zinc-500">None yet.</p> : (
          <ul className="space-y-2">{renders.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 text-sm"><span className="text-zinc-400">{fmtTime(r.options?.start ?? 0)} · {r.options?.clipSeconds}s</span>
              <span className="flex items-center gap-3"><StatusBadge status={r.status} />
                {r.status === 'SUCCEEDED' && r.outputs[0] && <a className="text-violet-300 hover:underline" href={`/api/renders/${r.id}/download`}>Download{r.sizeBytes ? ` (${fmtBytes(r.sizeBytes)})` : ''}</a>}
                {r.status === 'FAILED' && <span className="text-xs text-red-400 max-w-56 truncate" title={r.error ?? ''}>{r.error}</span>}</span></li>))}</ul>)}
      </Card>
    </div>
  );
}
