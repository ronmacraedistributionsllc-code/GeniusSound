'use client';

import { useRef } from 'react';
import { fmtTime } from '@/lib/client';
import { cn } from '@/lib/utils';

export type SectionRow = { id: string; order: number; label: string; startSec: number; endSec: number; energy: number | null };
export type EnergyPoint = { t: number; energy: number };

const COLORS: Record<string, string> = {
  intro: 'bg-zinc-600', verse: 'bg-blue-600', chorus: 'bg-fuchsia-600', bridge: 'bg-amber-600', instrumental: 'bg-teal-600', outro: 'bg-slate-600', drop: 'bg-red-600',
};

/** Audio player + section timeline + energy curve. Clicking a section seeks the audio. */
export function SongView({ audioUrl, duration, sections, energy, drops }: { audioUrl: string | null; duration: number; sections: SectionRow[]; energy: EnergyPoint[]; drops: { t: number; intensity: number }[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const seek = (t: number) => { if (audio.current) { audio.current.currentTime = t; void audio.current.play().catch(() => {}); } };
  const pts = energy.length > 1 ? energy.map((p) => `${(p.t / Math.max(duration, 1)) * 100},${100 - p.energy * 100}`).join(' ') : '';
  return (
    <div className="space-y-4">
      {audioUrl && <audio ref={audio} controls preload="metadata" src={audioUrl} className="w-full" />}
      <div>
        <div className="relative h-14 rounded-lg overflow-hidden flex bg-zinc-900" role="list" aria-label="Song sections">
          {sections.map((s) => (
            <button key={s.id} role="listitem" onClick={() => seek(s.startSec)} title={`${s.label} · ${fmtTime(s.startSec)}–${fmtTime(s.endSec)}`}
              style={{ width: `${((s.endSec - s.startSec) / Math.max(duration, 1)) * 100}%` }}
              className={cn('h-full text-[11px] font-medium capitalize text-white/90 truncate px-1 border-r border-black/40 hover:brightness-125', COLORS[s.label] ?? 'bg-zinc-700')}>
              {s.label}
            </button>
          ))}
          {drops.map((d) => (
            <span key={d.t} title={`Beat drop at ${fmtTime(d.t)}`} style={{ left: `${(d.t / Math.max(duration, 1)) * 100}%` }} className="absolute top-0 h-full w-0.5 bg-amber-300 pointer-events-none" />
          ))}
        </div>
        <div className="flex justify-between text-[11px] text-zinc-500 mt-1"><span>0:00</span><span>{fmtTime(duration)}</span></div>
      </div>
      {pts && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Energy</p>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16 rounded bg-zinc-900" aria-label="Energy curve" role="img">
            <polyline points={`0,100 ${pts} 100,100`} fill="rgba(168,85,247,0.25)" stroke="rgb(168,85,247)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      )}
    </div>
  );
}
