'use client';

import { AudioWaveform, Loader2, RefreshCw, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { btn, Card, Empty, StatusBadge } from '@/components/ui/ui';
import { api, fmtBytes, fmtTime, uploadWithProgress } from '@/lib/client';
import { SongView, type EnergyPoint, type SectionRow } from './SongView';

export type AnalysisData = {
  id: string; status: string; error: string | null; bpm: number | null; key: string | null; mode: string | null; durationSec: number;
  energyCurve: EnergyPoint[] | null; beatGrid: { beats?: number[]; drops?: { t: number; intensity: number }[] } | null; sections: SectionRow[];
} | null;
export type JobData = { id: string; status: string; progress: number; progressMessage: string | null; error: string | null } | null;
export type AudioData = { id: string; filename: string; sizeBytes: number; durationSec: number | null };
export type ProjectData = { id: string; title: string; description: string | null; status: string };

const ACTIVE = ['QUEUED', 'RUNNING'];

export function ProjectWorkspace({ project, audios, analysis: a0, job: j0 }: { project: ProjectData; audios: AudioData[]; analysis: AnalysisData; job: JobData }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(a0);
  const [job, setJob] = useState(j0);
  const [title, setTitle] = useState(project.title);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const active = !!job && ACTIVE.includes(job.status);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(async () => {
      try {
        const r = await api<{ analysis: AnalysisData; job: JobData }>(`/api/projects/${project.id}/analysis`);
        setAnalysis(r.analysis); setJob(r.job);
        if (r.job && !ACTIVE.includes(r.job.status)) router.refresh();
      } catch { /* transient; next tick retries */ }
    }, 2000);
    return () => clearInterval(t);
  }, [active, project.id, router]);

  async function upload(f: File) {
    setError(''); setPct(0);
    const fd = new FormData(); fd.append('file', f);
    try {
      const r = await uploadWithProgress<{ job: JobData }>(`/api/projects/${project.id}/audio`, fd, setPct);
      setJob(r.job); setPct(null); router.refresh();
    } catch (e) { setError((e as Error).message); setPct(null); }
    if (file.current) file.current.value = '';
  }
  async function reanalyze() {
    setError('');
    try { const r = await api<{ job: JobData }>(`/api/projects/${project.id}/analyze`, { method: 'POST' }); setJob(r.job); } catch (e) { setError((e as Error).message); }
  }
  async function saveTitle() {
    if (title.trim() === project.title) return;
    try { await api(`/api/projects/${project.id}`, { method: 'PATCH', body: JSON.stringify({ title }) }); router.refresh(); } catch (e) { setError((e as Error).message); setTitle(project.title); }
  }

  const latest = audios[0];
  const done = analysis?.status === 'COMPLETE';
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} maxLength={120} aria-label="Project title"
          className="text-3xl font-bold bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-violet-500 focus:outline-none flex-1 min-w-0" />
        <StatusBadge status={project.status} />
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      <Card>
        <h2 className="font-semibold mb-3">Song</h2>
        {latest && (
          <p className="text-sm text-zinc-400 mb-3">{latest.filename} · {fmtBytes(latest.sizeBytes)}{latest.durationSec ? ` · ${fmtTime(latest.durationSec)}` : ''}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <input ref={file} type="file" accept=".mp3,.wav,audio/mpeg,audio/wav" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} aria-label="Choose MP3 or WAV file" />
          <button onClick={() => file.current?.click()} disabled={pct !== null || active} className={btn.primary}><Upload className="w-4 h-4" />{latest ? 'Replace / add song' : 'Upload song (MP3 or WAV)'}</button>
          {latest && <button onClick={reanalyze} disabled={active || pct !== null} className={btn.ghost}><RefreshCw className="w-4 h-4" />Re-analyze</button>}
          {pct !== null && <div className="flex-1 min-w-40"><div className="h-2 rounded bg-zinc-800 overflow-hidden"><div style={{ width: `${pct}%` }} className="h-full bg-violet-500 transition-all" /></div><p className="text-xs text-zinc-500 mt-1">Uploading… {pct}%</p></div>}
        </div>
        <p className="text-xs text-zinc-600 mt-3">MP3 or WAV, up to 100 MB. Analysis runs in the background and needs the media service and worker running.</p>
      </Card>

      {job && (active || job.status === 'FAILED') && (
        <Card className={job.status === 'FAILED' ? 'border-red-900' : ''}>
          <div className="flex items-center gap-3">
            {active ? <Loader2 className="w-5 h-5 animate-spin text-violet-400" /> : <AudioWaveform className="w-5 h-5 text-red-400" />}
            <div className="flex-1">
              <p className="font-medium">{active ? 'Analyzing your song' : 'Analysis failed'} <span className="text-zinc-500 font-normal">· {job.progressMessage}</span></p>
              {active && <div className="h-1.5 rounded bg-zinc-800 mt-2 overflow-hidden"><div style={{ width: `${job.progress}%` }} className="h-full bg-violet-500 transition-all" /></div>}
              {job.status === 'FAILED' && <p className="text-sm text-red-400 mt-1">{job.error}</p>}
            </div>
            {active ? <button onClick={() => api(`/api/jobs/${job.id}/cancel`, { method: 'POST' }).then(() => setJob({ ...job, status: 'CANCELLED' })).catch((e) => setError(e.message))} className={btn.ghost}>Cancel</button>
              : <button onClick={() => api(`/api/jobs/${job.id}/retry`, { method: 'POST' }).then(() => setJob({ ...job, status: 'QUEUED', progress: 0, error: null })).catch((e) => setError(e.message))} className={btn.ghost}>Retry</button>}
          </div>
        </Card>
      )}

      {done && analysis ? (
        <Card>
          <h2 className="font-semibold mb-4">Song analysis</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {[['BPM', analysis.bpm ? Math.round(analysis.bpm) : '—'], ['Key', analysis.key ?? '—'], ['Duration', fmtTime(analysis.durationSec)], ['Sections', analysis.sections.length]].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg bg-zinc-900 p-3"><p className="text-xs text-zinc-500">{k}</p><p className="text-xl font-semibold mt-0.5">{v}</p></div>
            ))}
          </div>
          <SongView audioUrl={latest ? `/api/projects/${project.id}/audio/${latest.id}` : null} duration={analysis.durationSec} sections={analysis.sections}
            energy={analysis.energyCurve ?? []} drops={analysis.beatGrid?.drops ?? []} />
          <p className="text-xs text-zinc-600 mt-4">Section labels are automatic best guesses from energy and repetition. Tempo may read at half or double time on some tracks.</p>
        </Card>
      ) : !latest ? (
        <Empty title="Upload a song to get started">Genius Sound will detect tempo, key, sections and beat drops.</Empty>
      ) : null}
    </div>
  );
}
