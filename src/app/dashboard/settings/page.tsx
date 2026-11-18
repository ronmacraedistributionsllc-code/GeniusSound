import { Card, PageHeader } from '@/components/ui/ui';
import { requireUserPage } from '@/lib/auth';
import { getEnv } from '@/lib/env';
import { mediaApi } from '@/lib/media-api';
import { countStuckJobs } from '@/lib/jobs';

export default async function SettingsPage() {
  const user = await requireUserPage();
  const env = getEnv();
  const [media, waiting] = await Promise.all([
    Promise.all([mediaApi.health(), mediaApi.providers()]).then(([h, p]) => ({ ok: true as const, h, p })).catch((e: Error) => ({ ok: false as const, error: e.message })),
    countStuckJobs(),
  ]);
  return (
    <>
      <PageHeader title="Settings" subtitle="Account and service status." />
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold mb-3">Account</h2>
          <dl className="text-sm space-y-2"><div className="flex justify-between"><dt className="text-zinc-500">Name</dt><dd>{user.name ?? '—'}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Email</dt><dd>{user.email}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Role</dt><dd>{user.role}</dd></div></dl>
          <p className="text-xs text-zinc-600 mt-4">Password change and profile editing are not built yet.</p>
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Media service</h2>
          {media.ok ? (
            <ul className="text-sm space-y-2">
              <li className="text-emerald-400">Connected ({env.API_URL})</li>
              <li className={media.h.ffmpeg.available ? 'text-zinc-300' : 'text-red-400'}>FFmpeg: {media.h.ffmpeg.available ? 'available' : 'not found — rendering will fail'}</li>
              {media.p.providers.map((p) => <li key={p.name} className="flex justify-between"><span>{p.name} <span className="text-zinc-600">({p.kind.toLowerCase()})</span></span><span className={p.configured ? 'text-emerald-400' : 'text-zinc-500'}>{p.configured ? 'configured' : 'not configured'}</span></li>)}
            </ul>
          ) : <p className="text-sm text-red-400">Cannot reach the media service at {env.API_URL}. {media.error}. Start it with ./scripts/start.sh.</p>}
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Storage & worker</h2>
          <p className="text-sm text-zinc-400">Storage: <span className="text-zinc-200">{env.STORAGE_DRIVER}</span> ({env.STORAGE_LOCAL_ROOT})</p>
          <p className={`text-sm mt-2 ${waiting ? 'text-amber-400' : 'text-zinc-400'}`}>{waiting ? `${waiting} job(s) have been waiting over a minute — is the worker running? (npm run worker)` : 'No stuck jobs detected.'}</p>
        </Card>
      </div>
    </>
  );
}
