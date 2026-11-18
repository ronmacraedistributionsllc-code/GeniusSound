import { notFound } from 'next/navigation';
import { ProjectWorkspace, type AnalysisData } from '@/components/projects/ProjectWorkspace';
import { requireUserPage } from '@/lib/auth';
import { plain } from '@/lib/client';
import { db } from '@/lib/db';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage();
  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: user.id },
    include: {
      audioUploads: { orderBy: { createdAt: 'desc' } },
      analyses: { orderBy: { createdAt: 'desc' }, take: 1, include: { sections: { orderBy: { order: 'asc' } } } },
      jobs: { where: { type: 'SONG_ANALYSIS' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  if (!project) notFound();
  const job = project.jobs[0];
  return (
    <ProjectWorkspace
      project={{ id: project.id, title: project.title, description: project.description, status: project.status }}
      audios={plain(project.audioUploads.map((a) => ({ id: a.id, filename: a.filename, sizeBytes: a.sizeBytes, durationSec: a.durationSec })))}
      analysis={plain(project.analyses[0] ?? null) as unknown as AnalysisData}
      job={job ? plain({ id: job.id, status: job.status, progress: job.progress, progressMessage: job.progressMessage, error: job.error }) : null}
    />
  );
}
