import { requireUser } from '@/lib/auth';
import { handle, ok } from '@/lib/http';
import { mediaApi } from '@/lib/media-api';

/** Which generation providers the media service has configured (for Settings). */
export const GET = handle(async () => {
  await requireUser();
  const r = await mediaApi.providers();
  return ok(r);
});
