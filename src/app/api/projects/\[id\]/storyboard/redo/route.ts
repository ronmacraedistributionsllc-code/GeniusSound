import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok } from '@/lib/http';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

/** Redo storyboard to next version (after undo). */
export const POST = handle<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);

  const storyboard = await db.storyboard.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: 'desc' },
    include: { scenes: { include: { versions: { orderBy: { version: 'desc' } } } } },
  });

  if (!storyboard) throw new ApiError(404, 'No storyboard yet');

  // Get the most recent versions
  const hasUndoneVersions = storyboard.scenes.some(
    (s) => s.currentVersionId && s.versions.length > 0 &&
           s.versions[0].id !== s.currentVersionId
  );

  if (!hasUndoneVersions) throw new ApiError(409, 'Nothing to redo');

  // Redo each scene to its next version
  await Promise.all(
    storyboard.scenes.map(async (scene) => {
      const currentIdx = scene.versions.findIndex((v) => v.id === scene.currentVersionId);
      if (currentIdx > 0) {
        // Go to the previous version in the array (more recent)
        const nextVersion = scene.versions[currentIdx - 1];

        await db.storyboardScene.update({
          where: { id: scene.id },
          data: {
            description: nextVersion.description,
            location: nextVersion.location ?? undefined,
            cameraAngle: nextVersion.cameraAngle ?? undefined,
            cameraMove: nextVersion.cameraMove ?? undefined,
            lighting: nextVersion.lighting ?? undefined,
            currentVersionId: nextVersion.id,
          },
        });
      }
    })
  );

  return ok({ redone: true });
});
