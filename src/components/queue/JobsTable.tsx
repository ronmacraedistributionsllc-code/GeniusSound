'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { btn, Empty, StatusBadge } from '@/components/ui/ui';
import { api } from '@/lib/client';

export type JobRow = { id: string; type: string; status: string; progress: number; progressMessage: string | null; error: string | null; attempts: number; maxAttempts: number; createdAt: string; project: { id: string; title: string } | null };

export function JobsTable({ initial }: { initial: JobRow[] }) {
  const [jobs, setJobs] = useState(initial);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setJobs((await api<{ jobs: JobRow[] }>('/api/jobs')).jobs); } catch { /* keep last good data */ }
  }, []);
  useEffect(() => { const t = setInterval(refresh, 3000); return () => clearInterval(t); }, [refresh]);

  const act = (id: string, what: 'cancel' | 'retry') => api(`/api/jobs/${id}/${what}`, { method: 'POST' }).then(refresh).catch((e) => setError(e.message));
  if (jobs.length === 0) return <Empty title="The queue is empty">Analysis, generation and render jobs show up here with live progress.</Empty>;
  return (
    <div className="space-y-3">
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 text-left"><tr>{['Job', 'Project', 'Status', 'Progress', 'Attempts', 'Created', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="px-4 py-3 capitalize">{j.type.replaceAll('_', ' ').toLowerCase()}</td>
                <td className="px-4 py-3">{j.project ? <Link className="hover:text-violet-300" href={`/dashboard/projects/${j.project.id}`}>{j.project.title}</Link> : '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-3 min-w-48">
                  {['QUEUED', 'RUNNING'].includes(j.status) && <div className="h-1.5 rounded bg-zinc-800 overflow-hidden mb-1"><div style={{ width: `${j.progress}%` }} className="h-full bg-violet-500" /></div>}
                  <span className={j.status === 'FAILED' ? 'text-red-400 text-xs' : 'text-zinc-500 text-xs'}>{j.status === 'FAILED' ? j.error : j.progressMessage}</span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{j.attempts}/{j.maxAttempts}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(j.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {['QUEUED', 'RUNNING'].includes(j.status) && <button onClick={() => act(j.id, 'cancel')} className={btn.ghost}>Cancel</button>}
                  {['FAILED', 'CANCELLED'].includes(j.status) && <button onClick={() => act(j.id, 'retry')} className={btn.ghost}>Retry</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
