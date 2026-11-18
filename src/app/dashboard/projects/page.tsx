import { PageHeader } from '@/components/ui/ui';
import { ProjectsManager } from '@/components/projects/ProjectsManager';
import { requireUserPage } from '@/lib/auth';
import { plain } from '@/lib/client';
import { db } from '@/lib/db';

export default async function ProjectsPage() {
  const user = await requireUserPage();
  const projects = await db.project.findMany({
    where: { userId: user.id, status: { not: 'ARCHIVED' } }, orderBy: { updatedAt: 'desc' },
    include: { audioUploads: { select: { filename: true, durationSec: true }, take: 1, orderBy: { createdAt: 'desc' } } },
  });
  return (
    <>
      <PageHeader title="My Projects" subtitle="Create, rename, duplicate, delete and resume your music video projects." />
      <ProjectsManager projects={plain(projects.map((p) => ({ id: p.id, title: p.title, description: p.description, status: p.status, updatedAt: p.updatedAt, audio: p.audioUploads[0] ?? null })))} />
    </>
  );
}
