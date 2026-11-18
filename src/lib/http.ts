import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const notFound = (what = 'Resource') => new ApiError(404, `${what} not found`);

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler: same-origin check for mutations, uniform JSON errors, no stack leaks. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: e.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
      }
      console.error('[api] unhandled error', req.method, new URL(req.url).pathname, e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/** Reject cross-site mutating requests. Browsers always send Origin on POST/PATCH/DELETE. */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return; // non-browser clients (curl, workers) — cookies still required for auth
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, 'Bad origin');
  }
  if (host && originHost !== host) throw new ApiError(403, 'Cross-origin request blocked');
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, 'Body must be valid JSON');
  }
  return schema.parse(body);
}

export const ok = <T>(data: T, status = 200) => NextResponse.json(data, { status });
