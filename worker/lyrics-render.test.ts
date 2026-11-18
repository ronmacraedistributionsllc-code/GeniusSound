/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory Prisma stand-in for tests */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job, PrismaClient } from '@prisma/client';

const renderLyricVideo = vi.fn();
const renderFinal = vi.fn();
const exists = vi.fn();
vi.mock('../src/lib/media-api', async () => {
  class MediaApiError extends Error { constructor(m: string, public status: number | null, public retryable: boolean) { super(m); } }
  return { mediaApi: { renderLyricVideo: (...a: unknown[]) => renderLyricVideo(...a), renderFinal: (...a: unknown[]) => renderFinal(...a) }, MediaApiError };
});
vi.mock('../src/lib/storage', () => ({ getStorage: () => ({ exists, size: async () => 4096 }) }));

import { runLyricRender } from './lyrics-render';
import { processJob } from './runner';

function fakeDb(opts: { lyrics?: boolean; audio?: boolean } = { lyrics: true, audio: true }) {
  const job: any = { id: 'j1', projectId: 'p1', type: 'RENDER_ASSEMBLY', payload: { renderId: 'r1' }, status: 'RUNNING', attempts: 1, maxAttempts: 2, progress: 0 };
  const render: any = { id: 'r1', projectId: 'p1', status: 'QUEUED', options: { template: 'bold_center', aspect: '9:16', quality: '1080p', preview: false } };
  const outputs: any[] = [];
  const db: any = {
    jobRow: job, render, outputs,
    renderJob: {
      findUnique: async () => render,
      update: async ({ data }: any) => Object.assign(render, data),
      updateMany: async ({ where, data }: any) => (where.status?.in?.includes(render.status) ? (Object.assign(render, data), { count: 1 }) : { count: 0 }),
    },
    renderOutput: { create: async ({ data }: any) => { outputs.push(data); return data; } },
    storyboard: { findFirst: async () => db.board },
    board: null as any,
    audioUpload: { findFirst: async () => (opts.audio ? { storageKey: 'projects/p1/audio/a.wav', durationSec: 30 } : null) },
    lyrics: { findUnique: async () => (opts.lyrics ? { lines: [{ order: 0, text: 'hi there', startSec: 1, endSec: 2, words: [{ order: 0, word: 'hi', startSec: 1, endSec: 1.5 }, { order: 1, word: 'there', startSec: 1.5, endSec: 2 }] }] } : null) },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  db.job = {
    findUnique: async () => job,
    updateMany: async ({ where, data }: any) => (!where.status || where.status === job.status ? (Object.assign(job, data), { count: 1 }) : { count: 0 }),
  };
  return db;
}
const as = (d: any) => d as PrismaClient;

beforeEach(() => { renderFinal.mockReset(); renderLyricVideo.mockReset(); exists.mockReset().mockResolvedValue(true); });

describe('lyric render worker', () => {
  it('renders with saved word timings and records a real output', async () => {
    const db = fakeDb(); renderLyricVideo.mockResolvedValue({ output: 'x', duration: 30 });
    await runLyricRender(as(db), { id: 'j1', projectId: 'p1', payload: { renderId: 'r1' } } as unknown as Job);
    const call = renderLyricVideo.mock.calls[0][0];
    expect(call).toMatchObject({ audio: 'projects/p1/audio/a.wav', output: 'projects/p1/renders/r1.mp4', duration: 30, template: 'bold_center', aspect: '9:16' });
    expect(call.lines[0].words).toHaveLength(2);
    expect(db.render).toMatchObject({ status: 'SUCCEEDED', sizeBytes: 4096 });
    expect(db.outputs).toHaveLength(1);
  });
  it('never reports success if the output file is missing', async () => {
    const db = fakeDb(); renderLyricVideo.mockResolvedValue({ output: 'x', duration: 30 }); exists.mockResolvedValue(false);
    await processJob(as(db), db.jobRow as Job);
    expect(db.jobRow.status).toBe('FAILED'); expect(db.render.status).toBe('FAILED'); expect(db.outputs).toHaveLength(0);
  });
  it('fails clearly when there are no lyrics, without calling the renderer', async () => {
    const db = fakeDb({ audio: true, lyrics: false });
    await processJob(as(db), db.jobRow as Job);
    expect(renderLyricVideo).not.toHaveBeenCalled();
    expect(db.jobRow.status).toBe('FAILED'); expect(db.jobRow.error).toMatch(/no lyrics/i); expect(db.render.status).toBe('FAILED');
  });
  it('discards the result when cancelled mid-render', async () => {
    const db = fakeDb(); renderLyricVideo.mockImplementation(async () => { db.jobRow.status = 'CANCELLED'; return { output: 'x', duration: 30 }; });
    await runLyricRender(as(db), db.jobRow as Job);
    expect(db.outputs).toHaveLength(0); expect(db.render.status).not.toBe('SUCCEEDED');
  });
});

describe('final export worker', () => {
  const scene = (n: number, key: string | null) => ({ number: n, durationSec: 4, generations: key ? [{ storageKey: key }] : [] });
  it('refuses to export when a scene has no generated clip', async () => {
    const db = fakeDb(); db.render.kind = 'FINAL'; db.board = { scenes: [scene(1, 'k1'), scene(2, null)] };
    await processJob(as(db), db.jobRow as Job);
    expect(renderFinal).not.toHaveBeenCalled(); expect(db.jobRow.status).toBe('FAILED'); expect(db.jobRow.error).toContain('2');
  });
  it('assembles real clips in order with the song and records the output', async () => {
    const db = fakeDb(); db.render.kind = 'FINAL'; db.board = { scenes: [scene(1, 'k1'), scene(2, 'k2')] };
    renderFinal.mockResolvedValue({ output: 'x', duration: 8 });
    await processJob(as(db), db.jobRow as Job);
    expect(renderFinal.mock.calls[0][0]).toMatchObject({ clips: [{ path: 'k1', duration: 4 }, { path: 'k2', duration: 4 }], audio: 'projects/p1/audio/a.wav', transition: 'none' });
    expect(db.render.status).toBe('SUCCEEDED'); expect(db.outputs).toHaveLength(1);
  });
});
