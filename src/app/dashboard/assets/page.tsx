import Link from 'next/link';
import { Empty, PageHeader } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { fmtBytes, fmtTime } from '@/lib/client';
import { db } from '@/lib/db';

export default async function AssetsPage() {
  const user = await requireUserPage();
  const [audio, assets] = await Promise.all([
    db.audioUpload.findMany({ where: { project: { userId: user.id } }, orderBy: { createdAt: 'desc' }, take: 200, include: { project: { select: { id: true, title: true } } } }),
    db.projectAsset.findMany({ where: { project: { userId: user.id } }, orderBy: { createdAt: 'desc' }, take: 200, include: { project: { select: { id: true, title: true } } } }),
  ]);
  const rows = [
    ...audio.map((a) => ({ id: a.id, kind: 'Audio', name: a.filename, project: a.project, size: a.sizeBytes, extra: a.durationSec ? fmtTime(a.durationSec) : '', at: a.createdAt, href: `/api/projects/${a.project.id}/audio/${a.id}` })),
    ...assets.map((a) => ({ id: a.id, kind: a.kind[0] + a.kind.slice(1).toLowerCase(), name: a.filename, project: a.project, size: a.sizeBytes, extra: '', at: a.createdAt, href: null as string | null })),
  ].sort((x, y) => +y.at - +x.at);
  return (
    <>
      <PageHeader title="Asset Library" subtitle="Everything uploaded or generated across your projects." />
      {rows.length === 0 ? <Empty title="No assets yet">Songs you upload to a project appear here.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left"><tr>{['Type', 'Name', 'Project', 'Size', 'Length', 'Added', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 text-zinc-400">{r.kind}</td><td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3"><Link className="hover:text-violet-300" href={`/dashboard/projects/${r.project.id}`}>{r.project.title}</Link></td>
                  <td className="px-4 py-3">{fmtBytes(r.size)}</td><td className="px-4 py-3">{r.extra || '—'}</td><td className="px-4 py-3 text-zinc-500">{r.at.toLocaleDateString()}</td>
                  <td className="px-4 py-3">{r.href && <a className="text-violet-400 hover:underline" href={r.href} download={r.name}>Download</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
