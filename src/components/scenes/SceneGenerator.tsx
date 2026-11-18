/* eslint-disable @next/next/no-img-element -- small authenticated thumbnails, not optimizable */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { btn, Card, Empty, input, StatusBadge } from '@/components/ui/ui';
import { api, fmtTime } from '@/lib/client';

type Gen = { id: string; status: string; progress: number; error: string | null; provider: string };
type Scene = { id: string; number: number; title: string; description: string; startSec: number; durationSec: number; status: string; locked: boolean; generations: Gen[] };
type Artist = { id: string; name: string; otherNotes: string | null };
type Providers = { name: string; kind: string; configured: boolean }[];

export function SceneGenerator({ projectId }: { projectId: string }) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [providers, setProviders] = useState<Providers>([]);
  const [provider, setProvider] = useState('comfyui');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistId, setArtistId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [aname, setAname] = useState('');
  const [anotes, setAnotes] = useState('');

  const load = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([api<{ storyboard: { scenes: Scene[] } | null }>(`/api/projects/${projectId}/storyboard`), api<{ providers: Providers }>('/api/providers').catch(() => ({ providers: [] as Providers }))]);
      setScenes(b.storyboard?.scenes ?? []); setProviders(p.providers);
      setArtists((await api<{ artists: Artist[] }>('/api/artists')).artists);
    } catch { /* keep last good state */ }
  }, [projectId]);
  useEffect(() => { const t0 = setTimeout(load, 0); const t = setInterval(load, 4000); return () => { clearTimeout(t0); clearInterval(t); }; }, [load]);

  async function generate(id: string) {
    setBusy(true); setError('');
    try { await api(`/api/scenes/${id}/generate`, { method: 'POST', body: { provider, ...(artistId ? { artistRefId: artistId } : {}) } as never }); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function addArtist() {
    const f = fileRef.current?.files?.[0];
    if (!f || !aname.trim()) { setError('Add a name and a PNG/JPEG photo'); return; }
    setBusy(true); setError('');
    try {
      const fd = new FormData(); fd.append('name', aname); fd.append('notes', anotes); fd.append('file', f);
      await api('/api/artists', { method: 'POST', body: fd }); setAname(''); setAnotes(''); if (fileRef.current) fileRef.current.value = ''; await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function removeArtist(id: string) {
    try { await api(`/api/artists/${id}`, { method: 'DELETE' }); if (artistId === id) setArtistId(''); await load(); } catch (e) { setError((e as Error).message); }
  }
  if (scenes === null) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (scenes.length === 0) return <Empty title="No storyboard yet">Create concepts and a storyboard on the Storyboards screen first.</Empty>;
  const active = providers.find((p) => p.name === provider);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-zinc-400">Provider <select className="ml-2 rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-sm" value={provider} onChange={(e) => setProvider(e.target.value)}>
          {['comfyui', 'replicate', 'fal'].map((n) => <option key={n} value={n}>{n}{providers.find((p) => p.name === n)?.configured ? '' : ' (not configured)'}</option>)}</select></label>
        {active && !active.configured && <span className="text-xs text-amber-300">Not configured — local ComfyUI setup: docs/LOCAL_COMFYUI.md</span>}
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Artist reference (identity)</h2>
        <p className="text-xs text-zinc-500">Pick an artist and each new clip starts from their photo (image-to-video, local ComfyUI only). Likeness holds best near the start of a clip and can drift later — keep scenes short.</p>
        <label className="text-sm text-zinc-400">Use for new clips <select aria-label="Artist" className={`${input} mt-1`} value={artistId} onChange={(e) => setArtistId(e.target.value)}><option value="">None (text only)</option>{artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <div className="flex flex-wrap gap-2 items-end">
          <input aria-label="Artist name" className={`${input} max-w-48`} placeholder="Artist name" value={aname} onChange={(e) => setAname(e.target.value)} />
          <input aria-label="Look notes" className={`${input} max-w-64`} placeholder="Look notes (hair, style…)" value={anotes} onChange={(e) => setAnotes(e.target.value)} />
          <input ref={fileRef} aria-label="Reference photo" type="file" accept="image/png,image/jpeg" className="text-sm text-zinc-400" />
          <button className={btn.ghost} onClick={addArtist} disabled={busy}>Add artist</button>
        </div>
        {artists.length > 0 && <ul className="flex flex-wrap gap-3">{artists.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 p-2 text-sm"><img src={`/api/artists/${a.id}/image`} alt={a.name} className="w-10 h-10 rounded object-cover" />{a.name}
            <button className="text-xs text-red-400 hover:underline" onClick={() => removeArtist(a.id)} aria-label={`Remove ${a.name}`}>remove</button></li>))}</ul>}
      </Card>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {scenes.map((s) => {
        const g = s.generations[0];
        const running = g && ['QUEUED', 'RUNNING'].includes(g.status);
        return (
          <Card key={s.id} className="grid md:grid-cols-[1fr_320px] gap-4">
            <div className="space-y-2">
              <p className="font-medium">{s.number}. {s.title} <span className="text-xs text-zinc-500">{fmtTime(s.startSec)} · {s.durationSec.toFixed(1)}s</span></p>
              <p className="text-sm text-zinc-400 whitespace-pre-line line-clamp-4">{s.description}</p>
              <div className="flex items-center gap-3">
                <button className={btn.primary} disabled={busy || !!running || s.locked} onClick={() => generate(s.id)}>{g ? 'Regenerate' : 'Generate clip'}</button>
                {g && <StatusBadge status={g.status} />}
                {running && <span className="text-xs text-zinc-500">{g.progress}%</span>}
              </div>
              {g?.status === 'FAILED' && <p role="alert" className="text-xs text-red-400">{g.error}</p>}
            </div>
            <div className="aspect-video rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center text-xs text-zinc-600">
              {s.status === 'GENERATED' || g?.status === 'SUCCEEDED' ? <video key={g?.id} controls preload="metadata" className="w-full h-full" src={`/api/scenes/${s.id}/video`} /> : 'No clip yet'}
            </div>
          </Card>);
      })}
    </div>
  );
}
