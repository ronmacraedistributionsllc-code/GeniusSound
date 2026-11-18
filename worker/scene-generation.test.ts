/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory Prisma stand-in for tests */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job, PrismaClient } from '@prisma/client';

const generate = vi.fn(); const status = vi.fn(); const cancel = vi.fn(); const put = vi.fn();
vi.mock('../src/lib/media-api', async () => {
  class MediaApiError extends Error { constructor(m: string, public status: number | null, public retryable: boolean) { super(m); } }
  return { mediaApi: { generate: (...a: unknown[]) => generate(...a), generationStatus: (...a: unknown[]) => status(...a), cancelGeneration: (...a: unknown[]) => cancel(...a) }, MediaApiError };
});
vi.mock('../src/lib/env', () => ({ getEnv: () => ({ STORAGE_LOCAL_ROOT: '/data/storage' }) }));
vi.mock('../src/lib/storage', () => ({ getStorage: () => ({ put: (...a: unknown[]) => put(...a) }) }));

import { GEN_POLL_MS } from './scene-generation';
import { processJob } from './runner';

function fakeDb() {
  const jobRow: any = { id: 'j1', projectId: 'p1', type: 'SCENE_GENERATION', payload: { generationId: 'g1' }, status: 'RUNNING', attempts: 1, maxAttempts: 2 };
  const gen: any = { id: 'g1', sceneId: 's1', provider: 'comfyui', prompt: null, status: 'QUEUED', scene: { id: 's1', description: 'a car', location: 'street', cameraAngle: null, cameraMove: null, lighting: null, durationSec: 5, storyboard: { projectId: 'p1', treatment: { visualStyle: 'noir' } } } };
  const scene: any = { id: 's1', status: 'DRAFT' };
  const db: any = {
    jobRow, gen, scene,
    job: { findUnique: async () => jobRow, updateMany: async ({ where, data }: any) => (!where.status || where.status === jobRow.status ? (Object.assign(jobRow, data), { count: 1 }) : { count: 0 }) },
    sceneGeneration: { findUnique: async () => gen, update: async ({ data }: any) => Object.assign(gen, data) },
    storyboardScene: { update: async ({ data }: any) => Object.assign(scene, data), updateMany: async ({ where, data }: any) => (where.status === scene.status ? (Object.assign(scene, data), { count: 1 }) : { count: 0 }) },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  return db;
}
const as = (d: any) => d as PrismaClient;
const asJob = (d: any) => d.jobRow as Job;

beforeEach(() => { generate.mockReset().mockResolvedValue({ provider: 'comfyui', job_id: 'c1' }); status.mockReset(); cancel.mockReset().mockResolvedValue({}); put.mockReset(); GEN_POLL_MS.value = 1; vi.unstubAllGlobals(); });

describe('scene generation worker', () => {
  it('downloads the finished clip into storage and marks the scene generated', async () => {
    const db = fakeDb();
    status.mockResolvedValueOnce({ state: 'RUNNING', progress: 0.5, output_urls: [] }).mockResolvedValueOnce({ state: 'SUCCEEDED', progress: 1, output_urls: ['http://x/v.mp4'] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(4096), { status: 200 })));
    await processJob(as(db), asJob(db));
    expect(put).toHaveBeenCalledWith('projects/p1/scenes/g1.mp4', expect.any(Uint8Array));
    expect(db.gen).toMatchObject({ status: 'SUCCEEDED', storageKey: 'projects/p1/scenes/g1.mp4' }); expect(db.scene.status).toBe('GENERATED'); expect(db.jobRow.status).toBe('SUCCEEDED');
    expect(generate.mock.calls[0][0].prompt).toContain('noir');
  });
  it('reports provider failure honestly and never marks the scene generated', async () => {
    const db = fakeDb(); status.mockResolvedValue({ state: 'FAILED', progress: 0, output_urls: [], error: 'out of memory' });
    await processJob(as(db), asJob(db));
    expect(db.jobRow.status).toBe('FAILED'); expect(db.jobRow.error).toContain('out of memory');
    expect(db.gen.status).toBe('FAILED'); expect(db.scene.status).toBe('FAILED'); expect(put).not.toHaveBeenCalled();
  });
  it('fails if the downloaded clip is empty', async () => {
    const db = fakeDb(); status.mockResolvedValue({ state: 'SUCCEEDED', progress: 1, output_urls: ['http://x/v.mp4'] });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array(10), { status: 200 })));
    await processJob(as(db), asJob(db));
    expect(db.jobRow.status).toBe('FAILED'); expect(put).not.toHaveBeenCalled();
  });
  it('stops and cancels the provider job when the user cancels', async () => {
    const db = fakeDb(); status.mockImplementation(async () => { db.jobRow.status = 'CANCELLED'; return { state: 'RUNNING', progress: 0.2, output_urls: [] }; });
    await processJob(as(db), asJob(db));
    expect(cancel).toHaveBeenCalled(); expect(put).not.toHaveBeenCalled(); expect(db.gen.status).not.toBe('SUCCEEDED');
  });
  it('uses the artist reference photo as the start frame (image-to-video)', async () => {
    const db = fakeDb(); db.jobRow.payload = { generationId: 'g1', referenceKey: 'artists/u1/ref/photo.png' };
    status.mockResolvedValue({ state: 'FAILED', progress: 0, output_urls: [], error: 'stop' });
    await processJob(as(db), asJob(db));
    expect(generate.mock.calls[0][0]).toMatchObject({ kind: 'image_to_video', image_url: '/data/storage/artists/u1/ref/photo.png' });
  });
});
