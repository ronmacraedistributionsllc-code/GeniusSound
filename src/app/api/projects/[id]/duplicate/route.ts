import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { handle, ok } from '@/lib/http';
import { duplicateProject } from '@/lib/projects';

export const POST = handle<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return ok({ project: await duplicateProject(db, user.id, id) }, 201);
});
