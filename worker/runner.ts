import type { Job, PrismaClient } from '@prisma/client';
import { mediaApi, MediaApiError, type AnalysisResult } from '../src/lib/media-api';
import { getStorage } from '../src/lib/storage';
import { markGenerationFailed, runSceneGeneration } from './scene-generation';
import { markRenderFailed, runLyricRender, runLyricSync } from './lyrics-render';

type Db = PrismaClient;
export const STALE_MS = 15 * 60_000;

/** Atomically claim the next due job. updateMany on status=QUEUED means two workers can never both win. */
export async function claimNext(db: Db, now = new Date()): Promise<Job | null> {
  const candidate = await db.job.findFirst({
    where: { status: 'QUEUED', runAt: { lte: now } },
    orderBy: [{ priority: 'desc' }, { runAt: 'asc' }],
  });
  if (!candidate) return null;
  const r = await db.job.updateMany({
    where: { id: candidate.id, status: 'QUEUED' },
    data: { status: 'RUNNING', startedAt: now, attempts: { increment: 1 }, progress: 0, progressMessage: 'Starting', error: null },
  });
  if (r.count === 0) return null; // another worker took it
  return db.job.findUnique({ where: { id: candidate.id } });
}

/** Crash recovery: jobs left RUNNING by a dead worker go back to the queue (or fail if out of attempts). */
export async function recoverStale(db: Db, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_MS);
  const stale = await db.job.findMany({ where: { status: 'RUNNING', startedAt: { lt: cutoff } } });
  for (const j of stale) {
    const exhausted = j.attempts >= j.maxAttempts;
    await db.job.updateMany({
      where: { id: j.id, status: 'RUNNING' },
      data: exhausted
        ? { status: 'FAILED', finishedAt: now, error: 'Worker stopped while running this job', progressMessage: 'Failed' }
        : { status: 'QUEUED', runAt: now, progressMessage: 'Recovered after worker restart' },
    });
    if (exhausted) await markAnalysisFailed(db, j, 'Worker stopped while running this job');
  }
  return stale.length;
}

async function progress(db: Db, id: string, pct: number, msg: string) {
  await db.job.updateMany({ where: { id, status: 'RUNNING' }, data: { progress: pct, progressMessage: msg } });
}

async function stillRunning(db: Db, id: string) {
  return (await db.job.findUnique({ where: { id }, select: { status: true } }))?.status === 'RUNNING';
}

async function markAnalysisFailed(db: Db, job: Job, message: string) {
  const p = job.payload as { analysisId?: string } | null;
  if (p?.analysisId) await db.songAnalysis.updateMany({ where: { id: p.analysisId }, data: { status: 'FAILED', error: message.slice(0, 500) } });
  if (job.projectId) await db.project.updateMany({ where: { id: job.projectId, status: 'ANALYZING' }, data: { status: 'DRAFT' } });
}

export async function runSongAnalysis(db: Db, job: Job): Promise<void> {
  const { audioId, analysisId } = job.payload as { audioId: string; analysisId: string };
  const audio = await db.audioUpload.findUnique({ where: { id: audioId } });
  if (!audio) throw new MediaApiError('Audio upload no longer exists', 404, false);
  await db.songAnalysis.update({ where: { id: analysisId }, data: { status: 'RUNNING', error: null } });
  await progress(db, job.id, 10, 'Reading audio');
  const data = await getStorage().get(audio.storageKey);
  await progress(db, job.id, 25, 'Analyzing (tempo, key, sections)');
  const r: AnalysisResult = await mediaApi.analyze(audio.filename, data, audio.mimeType);
  if (!(await stillRunning(db, job.id))) return; // cancelled while the media service worked: discard results
  await progress(db, job.id, 90, 'Saving results');
  await db.$transaction([
    db.songSection.deleteMany({ where: { analysisId } }),
    db.songAnalysis.update({
      where: { id: analysisId },
      data: {
        bpm: r.bpm, key: r.key.key, mode: r.key.mode, bpmConfidence: null, durationSec: r.duration,
        energyCurve: r.energy, beatGrid: { beats: r.beats, drops: r.drops }, status: 'COMPLETE', error: null,
        sections: { create: r.sections.map((s) => ({ order: s.index, label: s.label, startSec: s.start, endSec: s.end, energy: s.energy })) },
      },
    }),
    db.project.updateMany({ where: { id: job.projectId ?? '' }, data: { analysisId, audioUploadId: audioId } }),
    db.project.updateMany({ where: { id: job.projectId ?? '', status: 'ANALYZING' }, data: { status: 'CONCEPTING' } }),
  ]);
  await db.job.updateMany({
    where: { id: job.id, status: 'RUNNING' },
    data: { status: 'SUCCEEDED', progress: 100, progressMessage: 'Done', finishedAt: new Date(), result: { analysisId } },
  });
}

const BACKOFF_MS = (attempt: number) => Math.min(5 * 60_000, 5_000 * 2 ** (attempt - 1));

/** Runs one claimed job; retries retryable failures with backoff; never leaves a job RUNNING. */
export async function processJob(db: Db, job: Job): Promise<void> {
  try {
    if (job.type === 'SONG_ANALYSIS') await runSongAnalysis(db, job);
    else if (job.type === 'RENDER_ASSEMBLY') await runLyricRender(db, job);
    else if (job.type === 'SCENE_GENERATION') await runSceneGeneration(db, job);
    else if (job.type === 'TRANSCRIPTION') await runLyricSync(db, job);
    else throw new MediaApiError(`No worker handler for ${job.type} yet`, null, false);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const retryable = e instanceof MediaApiError ? e.retryable : false;
    if (retryable && job.attempts < job.maxAttempts) {
      await db.job.updateMany({
        where: { id: job.id, status: 'RUNNING' },
        data: { status: 'QUEUED', runAt: new Date(Date.now() + BACKOFF_MS(job.attempts)), error: message.slice(0, 500), progressMessage: `Retrying (attempt ${job.attempts + 1} of ${job.maxAttempts})` },
      });
      return;
    }
    console.error(`[worker] job ${job.id} failed:`, message);
    const r = await db.job.updateMany({
      where: { id: job.id, status: 'RUNNING' },
      data: { status: 'FAILED', finishedAt: new Date(), error: message.slice(0, 500), progressMessage: 'Failed' },
    });
    if (r.count && job.type === 'SONG_ANALYSIS') await markAnalysisFailed(db, job, message);
    if (r.count && job.type === 'RENDER_ASSEMBLY') await markRenderFailed(db, job, message);
    if (r.count && job.type === 'SCENE_GENERATION') await markGenerationFailed(db, job, message);
  }
}
