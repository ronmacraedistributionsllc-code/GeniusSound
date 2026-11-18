import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { loadDirectorInput, rowToConcept, sceneRow } from '@/lib/director';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { mediaApi, MediaApiError } from '@/lib/media-api';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const storyboard = await db.storyboard.findFirst({
    where: { projectId: id }, orderBy: { createdAt: 'desc' },
    include: { scenes: { orderBy: { order: 'asc' }, include: { generations: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, status: true, progress: true, error: true, provider: true } } } } },
  });
  return ok({ storyboard });
});

const Body = z.object({ instructions: z.string().max(4000).default(''), artistNotes: z.string().max(2000).default('') });

/** Generate a storyboard from the selected concept. Replaces the previous draft only if it has no approved or locked scenes. */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const { instructions } = await parseJson(req, Body);
  const treatment = await db.creativeTreatment.findFirst({ where: { projectId: id, selected: true } });
  if (!treatment) throw new ApiError(422, 'Pick a concept first');
  const prev = await db.storyboard.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' }, include: { scenes: { select: { locked: true, status: true } } } });
  if (prev?.scenes.some((s) => s.locked || s.status === 'APPROVED')) throw new ApiError(409, 'This storyboard has approved or locked scenes. Unlock/reject them or duplicate the project before regenerating.');
  const input = await loadDirectorInput(db, id);
  let scenes;
  try {
    scenes = (await mediaApi.storyboard({ ...input, concept: rowToConcept(treatment), instructions })).scenes;
  } catch (e) {
    if (e instanceof MediaApiError) throw new ApiError(e.status === 503 ? 503 : 502, e.message);
    throw e;
  }
  const sb = await db.$transaction(async (tx) => {
    if (prev) await tx.storyboard.delete({ where: { id: prev.id } });
    const created = await tx.storyboard.create({ data: { projectId: id, treatmentId: treatment.id, title: treatment.title } });
    for (const [i, s] of scenes.entries()) {
      const scene = await tx.storyboardScene.create({ data: { storyboardId: created.id, ...sceneRow(s, i) } });
      const v = await tx.sceneVersion.create({ data: { sceneId: scene.id, version: 1, description: scene.description, changedBy: 'ai' } });
      await tx.storyboardScene.update({ where: { id: scene.id }, data: { currentVersionId: v.id } });
    }
    await tx.project.update({ where: { id }, data: { status: 'STORYBOARDING' } });
    return created;
  });
  return ok({ storyboardId: sb.id, scenes: scenes.length }, 201);
});
