import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const btn = {
  primary: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition',
  ghost: 'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800/70 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition',
  danger: 'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-red-300 bg-red-950/40 hover:bg-red-900/50 disabled:opacity-50 transition',
};
export const input = 'w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-zinc-400 mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur p-5', className)}>{children}</section>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
      <p className="font-medium text-zinc-200">{title}</p>
      {children && <div className="text-sm text-zinc-500 mt-2">{children}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  DRAFT: 'bg-zinc-800 text-zinc-300', ANALYZING: 'bg-blue-950 text-blue-300', CONCEPTING: 'bg-violet-950 text-violet-300',
  STORYBOARDING: 'bg-fuchsia-950 text-fuchsia-300', GENERATING: 'bg-blue-950 text-blue-300', ASSEMBLING: 'bg-amber-950 text-amber-300',
  RENDERING: 'bg-amber-950 text-amber-300', COMPLETE: 'bg-emerald-950 text-emerald-300', ARCHIVED: 'bg-zinc-800 text-zinc-500',
  QUEUED: 'bg-zinc-800 text-zinc-300', RUNNING: 'bg-blue-950 text-blue-300', SUCCEEDED: 'bg-emerald-950 text-emerald-300',
  FAILED: 'bg-red-950 text-red-300', CANCELLED: 'bg-zinc-800 text-zinc-500', PENDING: 'bg-zinc-800 text-zinc-300',
};
const LABELS: Record<string, string> = { CONCEPTING: 'Analyzed — ready for concepts', ANALYZING: 'Analyzing' };

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', TONES[status] ?? TONES.DRAFT)}>
      {LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

/** Honest placeholder for screens whose UI isn't wired up yet. No fake controls. */
export function NotWired({ title, phase, ready, missing }: { title: string; phase: string; ready: string[]; missing: string[] }) {
  return (
    <>
      <PageHeader title={title} subtitle={`${phase} — this screen is not wired up yet.`} />
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold text-emerald-300 mb-2">Already built (backend)</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5 list-disc pl-5">{ready.map((r) => <li key={r}>{r}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="font-semibold text-amber-300 mb-2">Still to build</h2>
          <ul className="text-sm text-zinc-400 space-y-1.5 list-disc pl-5">{missing.map((r) => <li key={r}>{r}</li>)}</ul>
        </Card>
      </div>
    </>
  );
}
