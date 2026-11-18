import type { Job, PrismaClient } from '@prisma/client';
import { loadLyricsForRender, saveLyrics } from '../src/lib/lyrics';
import { mediaApi, MediaApiError, type LyricVideoOptions } from '../src/lib/media-api';
import { getStorage } from '../src/lib/storage';

type Db = PrismaClient;

const stillRunning = async (db: Db, id: string) => (await db.job.findUnique({ where: { id }, select: { status: true } }))?.status === 'RUNNING';
const progress = (db: Db, id: string, pct: number, msg: string) => db.job.updateMany({ where: { id, status: 'RUNNING' }, data: { progress: pct, progressMessage: msg } });

/** Render a lyric video: real audio + saved word timings -> mp4 via the media service. Marks success only with a real output file. */
export async function runLyricRender(db: Db, job: Job): Promise<void> {
  const { renderId } = job.payload as { renderId: string };
  const render = await db.renderJob.findUnique({ where: { id: renderId } });
  if (!render) throw new MediaApiError('Render no longer exists', 404, false);
  const options = render.options as unknown as LyricVideoOptions;
  const projectId = job.projectId ?? render.projectId;
  const audio = await db.audioUpload.findFirst({ where: { projectId }, orderBy: { createdAt: 'desc' } });
  if (!audio) throw new MediaApiError('Project has no audio', 422, false);
  const lines = await loadLyricsForRender(db, projectId);
  if (!lines) throw new MediaApiError('Project has no lyrics', 422, false);
  const duration = audio.durationSec ?? lines[lines.length - 1].end + 2;

  await db.renderJob.update({ where: { id: renderId }, data: { status: 'RUNNING', startedAt: new Date(), error: null } });
  await progress(db, job.id, 10, 'Rendering lyric video');
  const outputKey = `projects/${projectId}/renders/${renderId}.mp4`;
  const r = await mediaApi.renderLyricVideo({ lines, audio: audio.storageKey, output: outputKey, duration, ...options });
  if (!(await stillRunning(db, job.id))) return; // cancelled: discard
  const storage = getStorage();
  if (!(await storage.exists(outputKey))) throw new MediaApiError('Renderer finished but produced no file', null, false);
  const sizeBytes = await storage.size(outputKey);
  await db.$transaction([
    db.renderOutput.create({ data: { renderJobId: renderId, label: 'Lyric video', storageKey: outputKey, mimeType: 'video/mp4', sizeBytes } }),
    db.renderJob.update({ where: { id: renderId }, data: { status: 'SUCCEEDED', progress: 100, outputKey, durationSec: r.duration, sizeBytes, finishedAt: new Date() } }),
  ]);
  await db.job.updateMany({ where: { id: job.id, status: 'RUNNING' }, data: { status: 'SUCCEEDED', progress: 100, progressMessage: 'Done', finishedAt: new Date(), result: { renderId } } });
}

/** Auto-sync: Whisper transcript aligned to the user's lyrics text. Requires faster-whisper on the media service (503 otherwise). */
export async function runLyricSync(db: Db, job: Job): Promise<void> {
  const { audioId } = job.payload as { audioId: string };
  const projectId = job.projectId!;
  const audio = await db.audioUpload.findUnique({ where: { id: audioId } });
  const lyrics = await db.lyrics.findUnique({ where: { projectId }, include: { lines: { orderBy: { order: 'asc' } } } });
  if (!audio || !lyrics || lyrics.lines.length === 0) throw new MediaApiError('Save lyrics before syncing', 422, false);
  await progress(db, job.id, 15, 'Transcribing audio');
  const { words } = await mediaApi.transcribe(audio.filename, await getStorage().get(audio.storageKey), audio.mimeType, lyrics.language);
  if (!(await stillRunning(db, job.id))) return;
  await progress(db, job.id, 80, 'Aligning lyrics');
  const aligned = await mediaApi.alignLyrics({ lyrics: lyrics.lines.map((l) => l.text).join('\n'), asr_words: words, song_duration: audio.durationSec ?? undefined });
  if (!(await stillRunning(db, job.id))) return;
  await saveLyrics(db, projectId, audioId, 'TRANSCRIBED', aligned.lines);
  await db.job.updateMany({ where: { id: job.id, status: 'RUNNING' }, data: { status: 'SUCCEEDED', progress: 100, progressMessage: 'Done', finishedAt: new Date(), result: { coverage: aligned.coverage } } });
}

export async function markRenderFailed(db: Db, job: Job, message: string) {
  const renderId = (job.payload as { renderId?: string } | null)?.renderId;
  if (renderId) await db.renderJob.updateMany({ where: { id: renderId, status: { in: ['QUEUED', 'RUNNING'] } }, data: { status: 'FAILED', error: message.slice(0, 500), finishedAt: new Date() } });
}
