import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { LYRIC_TEMPLATES } from '@/lib/lyrics';
import { mediaApi } from '@/lib/media-api';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };
const PLATFORMS = ['TIKTOK', 'INSTAGRAM_REELS', 'YOUTUBE_SHORTS'] as const;

/** Suggested promo windows from the real analysis (energy, drops, choruses, beat-snapped). */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const q = new URL(req.url).searchParams;
  const duration = Number(q.get('duration') ?? 15); const platform = q.get('platform') ?? 'TIKTOK'; const count = Math.min(10, Math.max(1, Number(q.get('count') ?? 3)));
  if (![10, 15, 30, 45, 60].includes(duration) || !PLATFORMS.includes(platform as never)) throw new ApiError(400, 'Invalid duration or platform');
  const a = await db.songAnalysis.findFirst({ where: { projectId: id, status: 'COMPLETE' }, orderBy: { createdAt: 'desc' }, include: { sections: { orderBy: { order: 'asc' } } } });
  if (!a || a.durationSec == null) throw new ApiError(422, 'Finish song analysis first');
  const grid = (a.beatGrid ?? {}) as { beats?: number[]; drops?: { t: number; intensity: number }[] };
  const analysis = { duration: a.durationSec, energy: a.energyCurve ?? [], beats: grid.beats ?? [], drops: grid.drops ?? [], sections: a.sections.map((s) => ({ label: s.label, start: s.startSec, end: s.endSec })) };
  try {
    return ok(await mediaApi.promoSuggest({ analysis, duration, count, platform }));
  } catch (e) { throw new ApiError(502, (e as Error).message); }
});

const Body = z.object({
  start: z.number().min(0), duration: z.number().min(5).max(60),
  template: z.enum(LYRIC_TEMPLATES).default('bold_center'), quality: z.enum(['1080p', '4k']).default('1080p'), preview: z.boolean().default(false),
});

/** Render one vertical 9:16 promo clip: the chosen window of the song with word-synced lyrics (if saved). */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const b = await parseJson(req, Body);
  const audio = await db.audioUpload.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } });
  if (!audio?.durationSec) throw new ApiError(422, 'Upload a song and finish analysis first');
  if (b.start + b.duration > audio.durationSec + 0.01) throw new ApiError(422, 'Clip runs past the end of the song');
  const options = { template: b.template, aspect: '9:16', quality: b.quality, preview: b.preview, start: b.start, clipSeconds: b.duration };
  const render = await db.renderJob.create({ data: { projectId: id, kind: 'PROMO_CLIP', preset: `${b.quality}-9:16`, options } });
  const job = await db.job.create({ data: { projectId: id, type: 'RENDER_ASSEMBLY', payload: { renderId: render.id }, progressMessage: 'Queued', maxAttempts: 2 } });
  return ok({ render, job }, 201);
});
