import type { Job, PrismaClient } from '@prisma/client';
import { mediaApi, MediaApiError } from '../src/lib/media-api';
import { scenePrompt } from '../src/lib/scene-prompt';
import { getStorage } from '../src/lib/storage';

type Db = PrismaClient;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const GEN_POLL_MS = { value: 5_000 };
const MAX_WAIT_MS = 90 * 60_000;

async function jobStatus(db: Db, id: string) {
  return (await db.job.findUnique({ where: { id }, select: { status: true } }))?.status;
}

/**
 * Submit a scene to the provider, poll until it finishes, download the clip into storage.
 * Success is only recorded when a non-empty file exists in storage.
 */
export async function runSceneGeneration(db: Db, job: Job): Promise<void> {
  const { generationId } = job.payload as { generationId: string };
  const gen = await db.sceneGeneration.findUnique({ where: { id: generationId }, include: { scene: { include: { storyboard: { include: { treatment: true } } } } } });
  if (!gen) throw new MediaApiError('Generation no longer exists', 404, false);
  const scene = gen.scene;
  const projectId = scene.storyboard.projectId;
  const prompt = gen.prompt ?? scenePrompt(scene, scene.storyboard.treatment?.visualStyle ?? null);
  await db.sceneGeneration.update({ where: { id: gen.id }, data: { status: 'RUNNING', startedAt: new Date(), error: null, prompt } });
  await db.storyboardScene.update({ where: { id: scene.id }, data: { status: 'GENERATING' } });

  const { job_id } = await mediaApi.generate({ provider: gen.provider, kind: 'text_to_video', prompt, duration_sec: scene.durationSec });
  const started = Date.now();
  let strikes = 0;
  for (;;) {
    if ((await jobStatus(db, job.id)) !== 'RUNNING') {
      await mediaApi.cancelGeneration(gen.provider, job_id).catch(() => undefined);
      return; // cancelled by the user: discard
    }
    if (Date.now() - started > MAX_WAIT_MS) {
      await mediaApi.cancelGeneration(gen.provider, job_id).catch(() => undefined);
      throw new MediaApiError('Generation timed out after 90 minutes', null, false);
    }
    let st;
    try { st = await mediaApi.generationStatus(gen.provider, job_id); strikes = 0; } catch (e) {
      if (e instanceof MediaApiError && e.retryable && ++strikes < 5) { await sleep(GEN_POLL_MS.value); continue; }
      throw e;
    }
    const pct = Math.round(10 + st.progress * 80);
    await db.job.updateMany({ where: { id: job.id, status: 'RUNNING' }, data: { progress: pct, progressMessage: `Generating (${st.state.toLowerCase()})` } });
    await db.sceneGeneration.update({ where: { id: gen.id }, data: { progress: pct } });
    if (st.state === 'FAILED' || st.state === 'CANCELLED') throw new MediaApiError(`Provider ${gen.provider}: ${st.error ?? st.state}`, null, false);
    if (st.state === 'SUCCEEDED') {
      const url = st.output_urls[0];
      if (!url) throw new MediaApiError('Provider finished but returned no video', null, false);
      const res = await fetch(url, { signal: AbortSignal.timeout(10 * 60_000) }).catch((e) => { throw new MediaApiError(`Could not download clip: ${(e as Error).message}`, null, true); });
      if (!res.ok) throw new MediaApiError(`Could not download clip (HTTP ${res.status})`, res.status, res.status >= 500);
      const data = new Uint8Array(await res.arrayBuffer());
      if (data.length < 1024) throw new MediaApiError('Downloaded clip is empty', null, false);
      if ((await jobStatus(db, job.id)) !== 'RUNNING') return;
      const key = `projects/${projectId}/scenes/${gen.id}.mp4`;
      await getStorage().put(key, data);
      await db.$transaction([
        db.sceneGeneration.update({ where: { id: gen.id }, data: { status: 'SUCCEEDED', progress: 100, storageKey: key, finishedAt: new Date(), jobId: job.id } }),
        db.storyboardScene.update({ where: { id: scene.id }, data: { status: 'GENERATED' } }),
      ]);
      await db.job.updateMany({ where: { id: job.id, status: 'RUNNING' }, data: { status: 'SUCCEEDED', progress: 100, progressMessage: 'Done', finishedAt: new Date(), result: { generationId: gen.id, bytes: data.length } } });
      return;
    }
    await sleep(GEN_POLL_MS.value);
  }
}

export async function markGenerationFailed(db: Db, job: Job, message: string) {
  const generationId = (job.payload as { generationId?: string } | null)?.generationId;
  if (!generationId) return;
  const gen = await db.sceneGeneration.findUnique({ where: { id: generationId } });
  if (!gen) return;
  await db.sceneGeneration.update({ where: { id: generationId }, data: { status: 'FAILED', error: message.slice(0, 500), finishedAt: new Date() } });
  await db.storyboardScene.updateMany({ where: { id: gen.sceneId, status: 'GENERATING' }, data: { status: 'FAILED' } });
}
