'use client';

import { useCallback, useEffect, useState } from 'react';
import { btn, Card, input, StatusBadge } from '@/components/ui/ui';
import { api, fmtBytes, fmtTime } from '@/lib/client';

type Line = { id: string; order: number; text: string; startSec: number; endSec: number };
type LyricsData = { id: string; source: 'MANUAL' | 'TRANSCRIBED' | 'UPLOADED'; lines: Line[] } | null;
type Render = { id: string; status: string; progress: number; error: string | null; preset: string | null; sizeBytes: number | null; createdAt: string; outputs: { id: string }[] };
type SyncJob = { status: string; progressMessage: string | null; error: string | null } | null;

const TEMPLATES = [['classic_karaoke', 'Classic karaoke (bottom, yellow)'], ['bold_center', 'Bold center (pink)'], ['minimal_top', 'Minimal top (cyan)']] as const;

export function LyricsStudio({ projectId, hasAudio, initial, initialText }: { projectId: string; hasAudio: boolean; initial: LyricsData; initialText: string }) {
  const [lyrics, setLyrics] = useState(initial);
  const [text, setText] = useState(initialText);
  const [renders, setRenders] = useState<Render[]>([]);
  const [sync, setSync] = useState<SyncJob>(null);
  const [opts, setOpts] = useState({ template: 'classic_karaoke', aspect: '16:9', quality: '1080p', preview: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [r, l, j] = await Promise.all([
        api<{ renders: Render[] }>(`/api/projects/${projectId}/renders`),
        api<{ lyrics: LyricsData }>(`/api/projects/${projectId}/lyrics`),
        api<{ jobs: (NonNullable<SyncJob> & { type: string; projectId?: string; project: { id: string } | null })[] }>('/api/jobs'),
      ]);
      setRenders(r.renders);
      setLyrics(l.lyrics);
      setSync(j.jobs.find((x) => x.type === 'TRANSCRIPTION' && x.project?.id === projectId) ?? null);
    } catch { /* keep last good state */ }
  }, [projectId]);
  useEffect(() => { const t0 = setTimeout(refresh, 0); const t = setInterval(refresh, 3000); return () => { clearTimeout(t0); clearInterval(t); }; }, [refresh]);

  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true); setError(''); setNote('');
    try { await fn(); if (done) setNote(done); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const save = () => run(() => api(`/api/projects/${projectId}/lyrics`, { method: 'PUT', body: { text } as never }), 'Saved. Timing is estimated until you run auto-sync.');
  const startSync = () => run(() => api(`/api/projects/${projectId}/lyrics/sync`, { method: 'POST' }), 'Auto-sync queued.');
  const startRender = () => run(() => api(`/api/projects/${projectId}/renders`, { method: 'POST', body: opts as never }), 'Render queued — watch progress below.');

  if (!hasAudio) return <Card><p className="text-sm text-zinc-400">Upload a song and let analysis finish before adding lyrics.</p></Card>;
  const syncing = sync && ['QUEUED', 'RUNNING'].includes(sync.status);
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="space-y-3">
        <h2 className="font-semibold">Lyrics</h2>
        <textarea aria-label="Lyrics" className={`${input} h-72 font-mono`} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Paste lyrics, one line per row.\n[Chorus] style headers are ignored.'} />
        <div className="flex flex-wrap gap-2">
          <button className={btn.primary} onClick={save} disabled={busy || !text.trim()}>Save lyrics</button>
          <button className={btn.ghost} onClick={startSync} disabled={busy || !lyrics || !!syncing}>Auto-sync with Whisper</button>
        </div>
        {syncing && <p className="text-xs text-blue-300">Syncing: {sync?.progressMessage}</p>}
        {sync?.status === 'FAILED' && <p role="alert" className="text-xs text-red-400">Auto-sync failed: {sync.error}</p>}
        {lyrics && <p className="text-xs text-zinc-500">{lyrics.lines.length} lines · timing is {lyrics.source === 'TRANSCRIBED' ? 'aligned to the audio' : 'ESTIMATED (spread by line length)'}.</p>}
        {lyrics && (
          <ol className="max-h-56 overflow-y-auto text-sm divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {lyrics.lines.map((l) => <li key={l.id} className="flex gap-3 px-3 py-1.5"><span className="w-20 shrink-0 text-zinc-500 tabular-nums">{fmtTime(l.startSec)}–{fmtTime(l.endSec)}</span><span>{l.text}</span></li>)}
          </ol>
        )}
      </Card>
      <div className="space-y-6">
        <Card className="space-y-3">
          <h2 className="font-semibold">Render lyric video</h2>
          <label className="block text-sm text-zinc-400">Style
            <select className={`${input} mt-1`} value={opts.template} onChange={(e) => setOpts({ ...opts, template: e.target.value })}>{TEMPLATES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-zinc-400">Aspect
              <select className={`${input} mt-1`} value={opts.aspect} onChange={(e) => setOpts({ ...opts, aspect: e.target.value })}><option>16:9</option><option>9:16</option><option>1:1</option></select></label>
            <label className="block text-sm text-zinc-400">Quality
              <select className={`${input} mt-1`} value={opts.quality} onChange={(e) => setOpts({ ...opts, quality: e.target.value })}><option>1080p</option><option>4k</option></select></label>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-400"><input type="checkbox" checked={opts.preview} onChange={(e) => setOpts({ ...opts, preview: e.target.checked })} /> Fast preview encode</label>
          <p className="text-xs text-zinc-500">Background is plain black for now; storyboard scenes become the background once scene generation is connected.</p>
          <button className={btn.primary} onClick={startRender} disabled={busy || !lyrics}>Render</button>
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Render history</h2>
          {renders.length === 0 ? <p className="text-sm text-zinc-500">No renders yet.</p> : (
            <ul className="space-y-2">{renders.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-400">{r.preset} · {new Date(r.createdAt).toLocaleString()}</span>
                <span className="flex items-center gap-3"><StatusBadge status={r.status} />
                  {r.status === 'SUCCEEDED' && r.outputs[0] && <a className="text-violet-300 hover:underline" href={`/api/renders/${r.id}/download`}>Download{r.sizeBytes ? ` (${fmtBytes(r.sizeBytes)})` : ''}</a>}
                  {r.status === 'FAILED' && <span className="text-xs text-red-400 max-w-48 truncate" title={r.error ?? ''}>{r.error}</span>}</span>
              </li>))}</ul>)}
        </Card>
      </div>
      {error && <p role="alert" className="lg:col-span-2 text-sm text-red-400">{error}</p>}
      {note && <p role="status" className="lg:col-span-2 text-sm text-emerald-400">{note}</p>}
    </div>
  );
}
