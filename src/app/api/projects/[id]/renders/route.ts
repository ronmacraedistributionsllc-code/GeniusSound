import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { LYRIC_TEMPLATES } from '@/lib/lyrics';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const renders = await db.renderJob.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, take: 50, include: { outputs: true } });
  return ok({ renders });
});

const Body = z.object({
  kind: z.enum(['LYRIC_VIDEO', 'FINAL']).default('LYRIC_VIDEO'),
  transition: z.enum(['none', 'fade', 'fadeblack', 'dissolve']).default('none'),
  template: z.enum(LYRIC_TEMPLATES).default('classic_karaoke'),
  aspect: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  quality: z.enum(['1080p', '4k']).default('1080p'),
  preview: z.boolean().default(false),
});

/** Queue a lyric-video render (black background; scene backgrounds arrive with the storyboard/generation phases). */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const options = await parseJson(req, Body);
  const [audio, lyrics] = await Promise.all([
    db.audioUpload.findFirst({ where: { projectId: id } }),
    db.lyrics.findUnique({ where: { projectId: id }, include: { _count: { select: { lines: true } } } }),
  ]);
  if (!audio) throw new ApiError(422, 'Upload a song first');
  if (options.kind === 'LYRIC_VIDEO' && (!lyrics || lyrics._count.lines === 0)) throw new ApiError(422, 'Save lyrics first');
  if (options.kind === 'FINAL') {
    const sb = await db.storyboard.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, include: { scenes: { select: { number: true, generations: { where: { status: 'SUCCEEDED' }, take: 1, select: { id: true } } } } } });
    if (!sb || sb.scenes.length === 0) throw new ApiError(422, 'Create a storyboard first');
    const missing = sb.scenes.filter((s) => s.generations.length === 0).map((s) => s.number);
    if (missing.length) throw new ApiError(422, `Generate clips for scene(s) ${missing.join(', ')} first`);
  }
  const render = await db.renderJob.create({
    data: { projectId: id, kind: options.kind === 'FINAL' ? (options.preview ? 'PREVIEW' : 'FINAL') : 'LYRIC_VIDEO', preset: `${options.quality}-${options.aspect}`, options },
  });
  const job = await db.job.create({ data: { projectId: id, type: 'RENDER_ASSEMBLY', payload: { renderId: render.id }, progressMessage: 'Queued', maxAttempts: 2 } });
  return ok({ render, job }, 201);
});
