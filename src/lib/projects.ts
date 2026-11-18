import type { PrismaClient } from '@prisma/client';
import { ApiError, notFound } from './http';
import { getStorage, newStorageKey } from './storage';

type Db = PrismaClient;

/** A project the user owns, or 404 (same answer for missing and not-yours, so ids can't be probed). */
export async function getOwnedProject(db: Db, userId: string, id: string) {
  const p = await db.project.findFirst({ where: { id, userId } });
  if (!p) throw notFound('Project');
  return p;
}

export async function createAnalysisJob(db: Db, projectId: string, audioId: string, durationSec: number | null) {
  const active = await db.job.findFirst({
    where: { projectId, type: 'SONG_ANALYSIS', status: { in: ['QUEUED', 'RUNNING'] } },
  });
  if (active) throw new ApiError(409, 'An analysis is already running for this project');
  const analysis = await db.songAnalysis.create({
    data: { projectId, audioId, durationSec: durationSec ?? 0, status: 'PENDING' },
  });
  const job = await db.job.create({
    data: { projectId, type: 'SONG_ANALYSIS', payload: { audioId, analysisId: analysis.id }, progressMessage: 'Queued' },
  });
  await db.project.update({ where: { id: projectId }, data: { status: 'ANALYZING' } });
  return { analysis, job };
}

export async function duplicateProject(db: Db, userId: string, id: string) {
  const src = await db.project.findFirst({
    where: { id, userId },
    include: { audioUploads: true, analyses: { where: { status: 'COMPLETE' }, orderBy: { createdAt: 'desc' }, take: 1, include: { sections: true } } },
  });
  if (!src) throw notFound('Project');
  const copy = await db.project.create({
    data: { userId, title: `${src.title} (copy)`.slice(0, 120), description: src.description },
  });
  const storage = getStorage();
  const audioMap = new Map<string, string>();
  for (const a of src.audioUploads) {
    const key = newStorageKey(copy.id, 'audio', a.filename);
    await storage.put(key, await storage.get(a.storageKey));
    const n = await db.audioUpload.create({
      data: { projectId: copy.id, filename: a.filename, storageKey: key, mimeType: a.mimeType, sizeBytes: a.sizeBytes, durationSec: a.durationSec },
    });
    audioMap.set(a.id, n.id);
  }
  const an = src.analyses[0];
  if (an && audioMap.has(an.audioId)) {
    const na = await db.songAnalysis.create({
      data: {
        projectId: copy.id, audioId: audioMap.get(an.audioId)!, bpm: an.bpm, bpmConfidence: an.bpmConfidence, key: an.key, mode: an.mode,
        durationSec: an.durationSec, energyCurve: an.energyCurve ?? undefined, beatGrid: an.beatGrid ?? undefined, status: 'COMPLETE',
        sections: { create: an.sections.map((s) => ({ order: s.order, label: s.label, startSec: s.startSec, endSec: s.endSec, energy: s.energy, notes: s.notes })) },
      },
    });
    await db.project.update({ where: { id: copy.id }, data: { analysisId: na.id, audioUploadId: audioMap.get(an.audioId) } });
  } else if (audioMap.size) {
    await db.project.update({ where: { id: copy.id }, data: { audioUploadId: [...audioMap.values()][0] } });
  }
  return copy;
}

/** Deletes stored files first, then the project (rows cascade). Files shared with nothing else, so safe to remove. */
export async function deleteProject(db: Db, userId: string, id: string) {
  const p = await db.project.findFirst({ where: { id, userId }, include: { audioUploads: true, assets: true } });
  if (!p) throw notFound('Project');
  const storage = getStorage();
  const keys = [...p.audioUploads.map((a) => a.storageKey), ...p.assets.map((a) => a.storageKey)];
  await Promise.all(keys.map((k) => storage.delete(k).catch((e) => console.error('[storage] delete failed', k, e))));
  await db.project.delete({ where: { id } });
}

