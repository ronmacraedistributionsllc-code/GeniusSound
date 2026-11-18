import { clearSession } from '@/lib/auth';
import { handle, ok } from '@/lib/http';

export const POST = handle(async () => {
  await clearSession();
  return ok({ ok: true });
});
