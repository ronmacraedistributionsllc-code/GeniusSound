import type { PrismaClient } from '@prisma/client';
import { ApiError } from './http';
import type { Concept, DirectorAnalysis, DirectorScene } from './media-api';

type Db = PrismaClient;

/** Latest COMPLETE analysis in the shape the creative director expects. */
export async function loadDirectorInput(db: Db, projectId: string): Promise<{ analysis: DirectorAnalysis; lyrics: string }> {
  const a = await db.songAnalysis.findFirst({ where: { projectId, status: 'COMPLETE' }, orderBy: { createdAt: 'desc' }, include: { sections: { orderBy: { order: 'asc' } } } });
  if (!a || a.bpm == null || !a.key || a.durationSec == null) throw new ApiError(422, 'Finish song analysis first');
  const grid = (a.beatGrid ?? {}) as { drops?: { t: number; intensity: number }[] };
  const lyr = await db.lyrics.findUnique({ where: { projectId }, include: { lines: { orderBy: { order: 'asc' } } } });
  return {
    analysis: {
      duration: a.durationSec, bpm: a.bpm, key: { key: a.key },
      sections: a.sections.map((s) => ({ label: s.label, start: s.startSec, end: s.endSec, energy: s.energy ?? 0 })),
      drops: grid.drops ?? [],
    },
    lyrics: lyr?.lines.map((l) => l.text).join('\n') ?? '',
  };
}

export const conceptToRow = (projectId: string, c: Concept, instructions: string) => ({
  projectId, title: c.title.slice(0, 200), logline: c.logline, mood: c.mood, visualStyle: c.visual_style,
  palette: c.color_palette.join(', '), locations: c.locations, directorNotes: { treatment: c.treatment },
  userInstructions: instructions || null,
});

export const rowToConcept = (t: { title: string; logline: string | null; mood: string | null; visualStyle: string | null; palette: string | null; locations: unknown; directorNotes: unknown }): Concept => ({
  title: t.title, logline: t.logline ?? '', mood: t.mood ?? '', visual_style: t.visualStyle ?? '',
  color_palette: t.palette ? t.palette.split(',').map((x) => x.trim()).filter(Boolean) : [],
  locations: Array.isArray(t.locations) ? (t.locations as string[]) : [],
  treatment: (t.directorNotes as { treatment?: string } | null)?.treatment ?? '',
});

/** Scene row data from a director scene. Every scene starts DRAFT with version 1 recording who wrote it. */
export function sceneRow(s: DirectorScene, order: number) {
  const extras = [s.characters.length ? `Characters: ${s.characters.join(', ')}` : '', s.wardrobe ? `Wardrobe: ${s.wardrobe}` : '', s.vehicles.length ? `Vehicles: ${s.vehicles.join(', ')}` : '', s.props.length ? `Props: ${s.props.join(', ')}` : ''].filter(Boolean).join('. ');
  const description = extras ? `${s.description}\n${extras}` : s.description;
  return {
    order, number: order + 1, title: `${s.section ?? 'Scene'} ${order + 1}`.slice(0, 120), description, sectionLabel: s.section ?? null,
    lyricText: s.lyrics ?? null, startSec: s.start, durationSec: Math.max(0.1, s.end - s.start), location: s.location,
    cameraAngle: s.camera_angle, cameraMove: s.camera_movement, lighting: s.lighting, transition: s.transition,
  };
}
