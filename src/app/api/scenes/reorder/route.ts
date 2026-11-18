import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok, parseJson } from '@/lib/http';

const Body = z.object({
  sceneIds: z.array(z.string()).min(1),
});

export const POST = handle(async (req) => {
  const user = await requireUser();
  const { sceneIds } = await parseJson(req, Body);

  // Verify all scenes belong to user's projects
  const scenes = await db.storyboardScene.findMany({
    where: { id: { in: sceneIds } },
    include: { storyboard: { include: { project: { select: { userId: true } } } } },
  });

  if (scenes.length !== sceneIds.length) throw new ApiError(404, 'Some scenes not found');
  if (scenes.some((s) => s.storyboard.project.userId !== user.id)) throw new ApiError(403, 'Unauthorized');
  if (scenes.some((s) => s.locked)) throw new ApiError(409, 'Cannot reorder locked scenes');

  // Update order for each scene
  await Promise.all(
    sceneIds.map((id, idx) =>
      db.storyboardScene.update({
        where: { id },
        data: { order: idx + 1, number: idx + 1 },
      })
    )
  );

  return ok({ reordered: true });
});
