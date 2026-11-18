import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, assertSameOrigin, handle, parseJson } from './http';
import { rateLimit, resetRateLimits } from './rate-limit';

const req = (method: string, headers: Record<string, string> = {}, body?: string) =>
  new Request('http://localhost:3000/api/x', { method, headers: { host: 'localhost:3000', ...headers }, body });

describe('handle', () => {
  it('maps ApiError, ZodError and unknown errors without leaking internals', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const a = await handle(async () => { throw new ApiError(404, 'nope'); })(req('GET'), {});
    expect([a.status, (await a.json()).error]).toEqual([404, 'nope']);
    const z1 = await handle(async () => { z.object({ a: z.string() }).parse({}); return new Response(); })(req('GET'), {});
    expect(z1.status).toBe(400);
    const u = await handle(async () => { throw new Error('secret db password in message'); })(req('GET'), {});
    expect(u.status).toBe(500);
    expect(JSON.stringify(await u.json())).not.toContain('secret');
    spy.mockRestore();
  });
  it('blocks cross-origin mutations but allows same-origin and non-browser clients', async () => {
    const h = handle(async () => new Response('ok'));
    expect((await h(req('POST', { origin: 'https://evil.example' }), {})).status).toBe(403);
    expect((await h(req('POST', { origin: 'http://localhost:3000' }), {})).status).toBe(200);
    expect((await h(req('POST'), {})).status).toBe(200);
    expect((await h(req('GET', { origin: 'https://evil.example' }), {})).status).toBe(200);
    expect(() => assertSameOrigin(req('POST', { origin: 'not a url' }))).toThrow(ApiError);
  });
  it('parseJson rejects non-JSON', async () => {
    await expect(parseJson(req('POST', {}, 'nope'), z.object({}))).rejects.toThrow(/valid JSON/);
  });
});

describe('rateLimit', () => {
  it('allows max hits per window then recovers', () => {
    resetRateLimits();
    expect([1, 2, 3].map((i) => rateLimit('k', 2, 1000, i))).toEqual([true, true, false]);
    expect(rateLimit('k', 2, 1000, 5000)).toBe(true);
    expect(rateLimit('other', 2, 1000, 1)).toBe(true);
  });
});
