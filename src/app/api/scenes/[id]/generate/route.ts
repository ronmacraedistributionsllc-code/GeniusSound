import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, notFound, ok, parseJson } from '@/lib/http';
import { mediaApi } from '@/lib/media-api';
import { scenePrompt } from '@/lib/scene-prompt';

const Body = z.object({ provider: z.enum(['comfyui', 'replicate', 'fal']).default('comfyui'), prompt: z.string().min(1).max(4000).optional() });

/** Queue AI generation of one scene. Refuses up front if the chosen provider isn't configured. */
export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const { provider, prompt } = await parseJson(req, Body);
  const scene = await db.storyboardScene.findFirst({ where: { id, storyboard: { project: { userId: user.id } } }, include: { storyboard: { include: { treatment: true } } } });
  if (!scene) throw notFound('Scene');
  if (scene.locked) throw new ApiError(409, 'Scene is locked; unlock it first');
  const p = (await mediaApi.providers()).providers.find((x) => x.name === provider);
  if (!p?.configured) throw new ApiError(503, `Provider '${provider}' is not configured. See docs/LOCAL_COMFYUI.md (local) or .env.example.`);
  if (await db.job.findFirst({ where: { projectId: scene.storyboard.projectId, type: 'SCENE_GENERATION', status: { in: ['QUEUED', 'RUNNING'] }, payload: { path: ['sceneId'], equals: id } } })) throw new ApiError(409, 'This scene is already generating');
  const gen = await db.sceneGeneration.create({ data: { sceneId: id, provider, prompt: prompt ?? scenePrompt(scene, scene.storyboard.treatment?.visualStyle ?? null), status: 'QUEUED' } });
  const job = await db.job.create({ data: { projectId: scene.storyboard.projectId, type: 'SCENE_GENERATION', payload: { generationId: gen.id, sceneId: id }, progressMessage: 'Queued', maxAttempts: 2 } });
  await db.sceneGeneration.update({ where: { id: gen.id }, data: { jobId: job.id } });
  return ok({ generation: gen, job }, 201);
});
