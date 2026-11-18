import type { PrismaClient } from '@prisma/client';
import type { AlignedLine } from './media-api';

type Db = PrismaClient;

/** Replace a project's lyrics with timed lines (one transaction; old lines and words cascade away). */
export async function saveLyrics(db: Db, projectId: string, audioId: string | null, source: 'MANUAL' | 'TRANSCRIBED', lines: AlignedLine[]) {
  const existing = await db.lyrics.findUnique({ where: { projectId } });
  if (existing) await db.lyricLine.deleteMany({ where: { lyricsId: existing.id } });
  const lyrics = existing
    ? await db.lyrics.update({ where: { id: existing.id }, data: { source, audioId, status: 'DRAFT' } })
    : await db.lyrics.create({ data: { projectId, audioId, source } });
  for (const [i, ln] of lines.entries()) {
    await db.lyricLine.create({
      data: {
        lyricsId: lyrics.id, order: i, text: ln.text, startSec: ln.start, endSec: ln.end,
        words: { create: ln.words.map((w, k) => ({ order: k, word: w.word, startSec: w.start, endSec: w.end })) },
      },
    });
  }
  return lyrics;
}

/** Shape the media service's renderer expects. */
export async function loadLyricsForRender(db: Db, projectId: string) {
  const lyrics = await db.lyrics.findUnique({
    where: { projectId },
    include: { lines: { orderBy: { order: 'asc' }, include: { words: { orderBy: { order: 'asc' } } } } },
  });
  if (!lyrics || lyrics.lines.length === 0) return null;
  return lyrics.lines.map((l) => ({
    text: l.text, start: l.startSec, end: l.endSec,
    words: l.words.map((w) => ({ word: w.word, start: w.startSec, end: w.endSec })),
  }));
}

export const LYRIC_TEMPLATES = ['classic_karaoke', 'bold_center', 'minimal_top'] as const;
