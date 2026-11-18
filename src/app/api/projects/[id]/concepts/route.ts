import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { conceptToRow, loadDirectorInput } from '@/lib/director';
import { ApiError, handle, ok, parseJson } from '@/lib/http';
import { mediaApi, MediaApiError } from '@/lib/media-api';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  return ok({ treatments: await db.creativeTreatment.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } }) });
});

const Body = z.object({ instructions: z.string().max(4000).default(''), count: z.number().int().min(1).max(6).default(3) });

/** Ask the LLM creative director for concepts. Real model output or a clear error (no LLM configured = 503). */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const { instructions, count } = await parseJson(req, Body);
  const input = await loadDirectorInput(db, id);
  let concepts;
  try {
    concepts = (await mediaApi.concepts({ ...input, instructions, count })).concepts;
  } catch (e) {
    if (e instanceof MediaApiError) throw new ApiError(e.status === 503 ? 503 : 502, e.message);
    throw e;
  }
  const rows = await db.$transaction(concepts.map((c) => db.creativeTreatment.create({ data: conceptToRow(id, c, instructions) })));
  return ok({ treatments: rows }, 201);
});
