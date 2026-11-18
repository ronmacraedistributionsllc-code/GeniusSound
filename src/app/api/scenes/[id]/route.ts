import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, notFound, ok, parseJson } from '@/lib/http';
import { guard, SceneAction } from '@/lib/scene-actions';

type Ctx = { params: Promise<{ id: string }> };

async function owned(userId: string, id: string) {
  const s = await db.storyboardScene.findFirst({ where: { id, storyboard: { project: { userId } } } });
  if (!s) throw notFound('Scene');
  return s;
}

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const scene = await owned(user.id, id);
  const input = await parseJson(req, SceneAction);
  const problem = guard(scene, input.action);
  if (problem) throw new ApiError(409, problem);
  switch (input.action) {
    case 'edit': {
      const { action: _a, ...fields } = input; void _a;
      const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (Object.keys(data).length === 0) throw new ApiError(400, 'Nothing to change');
      const last = await db.sceneVersion.findFirst({ where: { sceneId: id }, orderBy: { version: 'desc' } });
      const v = await db.sceneVersion.create({ data: { sceneId: id, version: (last?.version ?? 0) + 1, description: (fields.description ?? scene.description), changedBy: 'user' } });
      // editing an approved scene sends it back to review: approval applied to the OLD content
      await db.storyboardScene.update({ where: { id }, data: { ...data, currentVersionId: v.id, status: scene.status === 'APPROVED' ? 'PENDING_REVIEW' : scene.status, approvedAt: null } });
      break;
    }
    case 'approve': await db.storyboardScene.update({ where: { id }, data: { status: 'APPROVED', approvedAt: new Date() } }); break;
    case 'reject': await db.storyboardScene.update({ where: { id }, data: { status: 'REJECTED', approvedAt: null } }); break;
    case 'lock': await db.storyboardScene.update({ where: { id }, data: { locked: true } }); break;
    case 'unlock': await db.storyboardScene.update({ where: { id }, data: { locked: false } }); break;
    case 'move': {
      const siblings = await db.storyboardScene.findMany({ where: { storyboardId: scene.storyboardId }, orderBy: { order: 'asc' }, select: { id: true } });
      const i = siblings.findIndex((s) => s.id === id);
      const j = input.direction === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= siblings.length) throw new ApiError(409, 'Already at the edge');
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      // order/number are display positions; timing (startSec/durationSec) stays with the scene
      await db.$transaction(siblings.map((s, k) => db.storyboardScene.update({ where: { id: s.id }, data: { order: k, number: k + 1 } })));
      break;
    }
  }
  return ok({ ok: true });
});

export const DELETE = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const scene = await owned(user.id, id);
  const problem = guard(scene, 'delete');
  if (problem) throw new ApiError(409, problem);
  await db.storyboardScene.delete({ where: { id } });
  return ok({ ok: true });
});
