import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { saveLyrics } from '@/lib/lyrics';
import { mediaApi } from '@/lib/media-api';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const lyrics = await db.lyrics.findUnique({
    where: { projectId: id },
    include: { lines: { orderBy: { order: 'asc' }, include: { words: { orderBy: { order: 'asc' } } } } },
  });
  return ok({ lyrics });
});

const Body = z.object({ text: z.string().min(1).max(20_000) });

/** Save pasted lyrics. Timing is ESTIMATED (spread by length) until the user runs auto-sync; the UI says so. */
export const PUT = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const { text } = await parseJson(req, Body);
  const audio = await db.audioUpload.findFirst({ where: { projectId: id }, orderBy: { createdAt: 'desc' } });
  if (!audio?.durationSec) throw new ApiError(422, 'Upload a song and let analysis finish first');
  const aligned = await mediaApi.alignLyrics({ lyrics: text, song_duration: audio.durationSec });
  const lyrics = await saveLyrics(db, id, audio.id, 'MANUAL', aligned.lines);
  return ok({ lyrics, lines: aligned.lines.length, timing: 'estimated' });
});
