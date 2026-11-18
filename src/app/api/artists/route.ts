import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiError, handle, ok } from '@/lib/http';
import { ImageValidationError, MAX_IMAGE_BYTES, validateImage } from '@/lib/image-file';
import { getStorage, newStorageKey } from '@/lib/storage';

export const GET = handle(async () => {
  const user = await requireUser();
  const artists = await db.artistReference.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, include: { images: { select: { id: true }, take: 1 } } });
  return ok({ artists });
});

/** Add an artist reference: name + notes + one clear photo (PNG/JPEG). Used as the start frame for scene generation. */
export const POST = handle(async (req) => {
  const user = await requireUser();
  if (Number(req.headers.get('content-length') ?? 0) > MAX_IMAGE_BYTES + 1024 * 1024) throw new ApiError(413, 'Image is too large (10 MB max)');
  let form: FormData;
  try { form = await req.formData(); } catch { throw new ApiError(400, 'Expected multipart form data'); }
  const name = String(form.get('name') ?? '').trim();
  if (!name || name.length > 80) throw new ApiError(400, 'Name is required (80 characters max)');
  const notes = String(form.get('notes') ?? '').trim().slice(0, 1000);
  const file = form.get('file');
  if (!(file instanceof File)) throw new ApiError(400, 'Missing "file" field');
  const data = new Uint8Array(await file.arrayBuffer());
  let meta;
  try { meta = validateImage(data); } catch (e) { if (e instanceof ImageValidationError) throw new ApiError(422, e.message); throw e; }
  const key = newStorageKey(`artists/${user.id}`, 'ref', `photo.${meta.ext}`);
  await getStorage().put(key, data);
  const artist = await db.artistReference.create({
    data: { userId: user.id, name, otherNotes: notes || null, images: { create: { storageKey: key, mimeType: meta.mimeType, sizeBytes: data.length } } },
    include: { images: { select: { id: true } } },
  });
  return ok({ artist }, 201);
});
