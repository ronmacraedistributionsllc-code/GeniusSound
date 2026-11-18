import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok, parseJson } from '@/lib/http';
import { deleteProject, getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

const patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  status: z.literal('ARCHIVED').optional(),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const GET = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const project = await db.project.findUnique({
    where: { id },
    include: { audioUploads: { orderBy: { createdAt: 'desc' } }, analyses: { orderBy: { createdAt: 'desc' }, take: 1, include: { sections: { orderBy: { order: 'asc' } } } } },
  });
  return ok({ project });
});

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const input = await parseJson(req, patch);
  const project = await db.project.update({ where: { id }, data: input });
  return ok({ project });
});

export const DELETE = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await deleteProject(db, user.id, id);
  return ok({ ok: true });
});
