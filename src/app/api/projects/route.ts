import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok, parseJson } from '@/lib/http';

const projectInput = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(1000).optional(),
});

export const GET = handle(async () => {
  const user = await requireUser();
  const projects = await db.project.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
    include: { audioUploads: { select: { filename: true, durationSec: true }, take: 1, orderBy: { createdAt: 'desc' } } },
  });
  return ok({ projects });
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, projectInput);
  const project = await db.project.create({ data: { userId: user.id, title: input.title, description: input.description || null } });
  return ok({ project }, 201);
});
