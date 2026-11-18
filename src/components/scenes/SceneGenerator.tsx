'use client';

import { useCallback, useEffect, useState } from 'react';
import { btn, Card, Empty, StatusBadge } from '@/components/ui/ui';
import { api, fmtTime } from '@/lib/client';

type Gen = { id: string; status: string; progress: number; error: string | null; provider: string };
type Scene = { id: string; number: number; title: string; description: string; startSec: number; durationSec: number; status: string; locked: boolean; generations: Gen[] };
type Providers = { name: string; kind: string; configured: boolean }[];

export function SceneGenerator({ projectId }: { projectId: string }) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [providers, setProviders] = useState<Providers>([]);
  const [provider, setProvider] = useState('comfyui');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([api<{ storyboard: { scenes: Scene[] } | null }>(`/api/projects/${projectId}/storyboard`), api<{ providers: Providers }>('/api/providers').catch(() => ({ providers: [] as Providers }))]);
      setScenes(b.storyboard?.scenes ?? []); setProviders(p.providers);
    } catch { /* keep last good state */ }
  }, [projectId]);
  useEffect(() => { const t0 = setTimeout(load, 0); const t = setInterval(load, 4000); return () => { clearTimeout(t0); clearInterval(t); }; }, [load]);

  async function generate(id: string) {
    setBusy(true); setError('');
    try { await api(`/api/scenes/${id}/generate`, { method: 'POST', body: { provider } as never }); await load(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
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
