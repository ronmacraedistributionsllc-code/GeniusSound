import Link from 'next/link';
import { Empty, PageHeader, StatusBadge } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { fmtTime } from '@/lib/client';
import { db } from '@/lib/db';

export default async function AnalysisPage() {
  const user = await requireUserPage();
  const rows = await db.songAnalysis.findMany({
    where: { project: { userId: user.id } }, orderBy: { createdAt: 'desc' }, take: 100,
    include: { project: { select: { id: true, title: true } }, audio: { select: { filename: true } }, _count: { select: { sections: true } } },
  });
  return (
    <>
      <PageHeader title="Song Analysis" subtitle="Tempo, key and structure for every analyzed song. Open a project to see its timeline." />
      {rows.length === 0 ? <Empty title="No analyses yet">Upload a song inside a project to analyze it.</Empty> : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-left"><tr>{['Project', 'File', 'BPM', 'Key', 'Length', 'Sections', 'Status'].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3"><Link className="hover:text-violet-300" href={`/dashboard/projects/${r.project.id}`}>{r.project.title}</Link></td>
                  <td className="px-4 py-3 text-zinc-400">{r.audio.filename}</td>
                  <td className="px-4 py-3">{r.bpm ? Math.round(r.bpm) : '—'}</td><td className="px-4 py-3">{r.key ?? '—'}</td>
                  <td className="px-4 py-3">{r.durationSec ? fmtTime(r.durationSec) : '—'}</td><td className="px-4 py-3">{r._count.sections}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
