import { requireUser } from '@/lib/auth';
import { AudioValidationError, MAX_AUDIO_BYTES, validateAudio } from '@/lib/audio-file';
import { db } from '@/lib/db';
import { ApiError, handle, ok } from '@/lib/http';
import { createAnalysisJob, getOwnedProject } from '@/lib/projects';
import { getStorage, newStorageKey } from '@/lib/storage';

export const POST = handle<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(db, user.id, id);
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_AUDIO_BYTES + 1024 * 1024) throw new ApiError(413, 'File is too large (100 MB max)');
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, 'Expected multipart form data with a "file" field');
  }
  const file = form.get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'Missing "file" field');
  const data = new Uint8Array(await file.arrayBuffer());
  let meta;
  try {
    meta = await validateAudio(file.name, data);
  } catch (e) {
    if (e instanceof AudioValidationError) throw new ApiError(422, e.message);
    throw e;
  }
  const key = newStorageKey(id, 'audio', file.name);
  await getStorage().put(key, data);
  const audio = await db.audioUpload.create({
    data: { projectId: id, filename: file.name.slice(0, 200), storageKey: key, mimeType: meta.mimeType, sizeBytes: data.length, durationSec: meta.durationSec },
  });
  await db.project.update({ where: { id }, data: { audioUploadId: audio.id } });
  const { job } = await createAnalysisJob(db, id, audio.id, meta.durationSec);
  return ok({ audio, job }, 201);
});
