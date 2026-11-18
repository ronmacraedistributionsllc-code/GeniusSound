'use client';

import { Copy, FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { btn, Card, Empty, input, StatusBadge } from '@/components/ui/ui';
import { api, fmtTime } from '@/lib/client';

export type ProjectRow = { id: string; title: string; description: string | null; status: string; updatedAt: string; audio: { filename: string; durationSec: number | null } | null };

export function ProjectsManager({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key); setError('');
    try { await fn(); router.refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  }

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    return run('create', async () => {
      const r = await api<{ project: { id: string } }>('/api/projects', { method: 'POST', body: JSON.stringify({ title }) });
      router.push(`/dashboard/projects/${r.project.id}`);
    });
  };
  const rename = () => editing && run(editing.id, async () => {
    await api(`/api/projects/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ title: editing.title }) });
    setEditing(null);
  });

  const shown = projects.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New project title (song or video name)" maxLength={120} required className={input} aria-label="New project title" />
        <button disabled={busy === 'create'} className={btn.primary + ' shrink-0'}><Plus className="w-4 h-4" />Create project</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {projects.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className={input + ' pl-9'} aria-label="Search projects" />
        </div>
      )}
      {projects.length === 0 ? (
        <Empty title="No projects yet">Create your first project above, then upload a song to analyze.</Empty>
      ) : shown.length === 0 ? (
        <Empty title="No projects match your search" />
      ) : (
        <div className="grid gap-3">
          {shown.map((p) => (
            <Card key={p.id} className="flex flex-col md:flex-row md:items-center gap-4">
              <FolderOpen className="w-5 h-5 text-violet-400 shrink-0 hidden md:block" />
              <div className="min-w-0 flex-1">
                {editing?.id === p.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); rename(); }} className="flex gap-2">
                    <input autoFocus value={editing.title} onChange={(e) => setEditing({ id: p.id, title: e.target.value })} maxLength={120} required className={input} aria-label="Project title" />
                    <button className={btn.primary}>Save</button>
                    <button type="button" onClick={() => setEditing(null)} className={btn.ghost}>Cancel</button>
                  </form>
                ) : (
                  <Link href={`/dashboard/projects/${p.id}`} className="font-semibold hover:text-violet-300 truncate block">{p.title}</Link>
                )}
                <p className="text-xs text-zinc-500 mt-1 truncate">
                  {p.audio ? `${p.audio.filename}${p.audio.durationSec ? ` · ${fmtTime(p.audio.durationSec)}` : ''}` : 'No song uploaded'} · updated {new Date(p.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={p.status} />
              <div className="flex items-center gap-1.5">
                <button title="Rename" aria-label={`Rename ${p.title}`} onClick={() => setEditing({ id: p.id, title: p.title })} className={btn.ghost}><Pencil className="w-4 h-4" /></button>
                <button title="Duplicate" aria-label={`Duplicate ${p.title}`} disabled={busy === 'dup' + p.id} onClick={() => run('dup' + p.id, async () => { await api(`/api/projects/${p.id}/duplicate`, { method: 'POST' }); })} className={btn.ghost}><Copy className="w-4 h-4" /></button>
                {confirmDel === p.id ? (
                  <>
                    <button onClick={() => run('del' + p.id, async () => { await api(`/api/projects/${p.id}`, { method: 'DELETE' }); setConfirmDel(null); })} disabled={busy === 'del' + p.id} className={btn.danger}>Delete forever</button>
                    <button onClick={() => setConfirmDel(null)} className={btn.ghost}>Keep</button>
                  </>
                ) : (
                  <button title="Delete" aria-label={`Delete ${p.title}`} onClick={() => setConfirmDel(p.id)} className={btn.danger}><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
