import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok } from '@/lib/http';
import { getOwnedProject } from '@/lib/projects';

type Ctx = { params: Promise<{ id: string }> };

/** Revert storyboard to previous version (before last edit). */
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

  // Check if any scene has previous versions
  const hasPreviousVersions = storyboard.scenes.some((s) => s.versions.length > 1);
  if (!hasPreviousVersions) throw new ApiError(409, 'No previous versions to undo');

  // Revert each scene to its previous version
  await Promise.all(
    storyboard.scenes.map(async (scene) => {
      if (scene.versions.length > 1) {
        // Get the previous version (second most recent)
        const prevVersion = scene.versions[1];

        // Update scene fields from previous version
        await db.storyboardScene.update({
          where: { id: scene.id },
          data: {
            description: prevVersion.description,
            location: prevVersion.location ?? undefined,
            cameraAngle: prevVersion.cameraAngle ?? undefined,
            cameraMove: prevVersion.cameraMove ?? undefined,
            lighting: prevVersion.lighting ?? undefined,
            currentVersionId: prevVersion.id,
          },
        });
      }
    })
  );

  return ok({ undone: true });
});
