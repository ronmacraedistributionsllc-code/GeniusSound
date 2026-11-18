/* eslint-disable @typescript-eslint/no-explicit-any -- in-memory Prisma stand-in for tests */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Job, PrismaClient } from '@prisma/client';

const analyze = vi.fn();
const storageGet = vi.fn();
vi.mock('../src/lib/media-api', async () => {
  class MediaApiError extends Error {
    constructor(m: string, public status: number | null, public retryable: boolean) { super(m); }
  }
  return { mediaApi: { analyze: (...a: unknown[]) => analyze(...a) }, MediaApiError };
});
vi.mock('../src/lib/storage', () => ({ getStorage: () => ({ get: storageGet }) }));

import { MediaApiError } from '../src/lib/media-api';
import { claimNext, processJob, recoverStale, STALE_MS } from './runner';

/** Minimal in-memory stand-in for the Prisma calls the worker uses. */
function fakeDb() {
  const jobs: Record<string, any> = {};
  const analyses: Record<string, any> = { a1: { id: 'a1', status: 'PENDING' } };
  const projects: Record<string, any> = { p1: { id: 'p1', status: 'ANALYZING', analysisId: null } };
  const sections: any[] = [];
  const match = (j: any, w: any = {}) =>
    (!w.id || j.id === w.id) && (!w.status || (typeof w.status === 'string' ? j.status === w.status : w.status.in ? w.status.in.includes(j.status) : true)) &&
    (!w.runAt || j.runAt <= w.runAt.lte) && (!w.startedAt || (j.startedAt && j.startedAt < w.startedAt.lt));
  const apply = (o: any, d: any) => { for (const [k, v] of Object.entries(d)) o[k] = v && typeof v === 'object' && 'increment' in (v as any) ? o[k] + (v as any).increment : v; };
  const db = {
    jobs, analyses, projects, sections,
    job: {
      findFirst: async ({ where }: any) => Object.values(jobs).filter((j) => match(j, where)).sort((a, b) => a.runAt - b.runAt)[0] ?? null,
      findMany: async ({ where }: any) => Object.values(jobs).filter((j) => match(j, where)),
      findUnique: async ({ where }: any) => jobs[where.id] ?? null,
      updateMany: async ({ where, data }: any) => { const m = Object.values(jobs).filter((j) => match(j, where)); m.forEach((j) => apply(j, data)); return { count: m.length }; },
    },
    audioUpload: { findUnique: async () => ({ id: 'au1', filename: 's.wav', storageKey: 'projects/p1/audio/s.wav', mimeType: 'audio/wav' }) },
    songAnalysis: {
      update: async ({ where, data }: any) => { const a = analyses[where.id]; const { sections: s, ...rest } = data; apply(a, rest); if (s?.create) sections.push(...s.create); return a; },
      updateMany: async ({ where, data }: any) => { apply(analyses[where.id], data); return { count: 1 }; },
    },
    songSection: { deleteMany: async () => { sections.length = 0; return { count: 0 }; } },
    project: {
      updateMany: async ({ where, data }: any) => { const p = projects[where.id]; if (!p || (where.status && p.status !== where.status)) return { count: 0 }; apply(p, data); return { count: 1 }; },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  return db;
}
const addJob = (db: ReturnType<typeof fakeDb>, over: Partial<Job> = {}) => {
  const j = { id: 'j1', projectId: 'p1', type: 'SONG_ANALYSIS', payload: { audioId: 'au1', analysisId: 'a1' }, status: 'QUEUED', priority: 0,
    attempts: 0, maxAttempts: 3, progress: 0, progressMessage: null, result: null, error: null, runAt: new Date(0), startedAt: null, finishedAt: null, ...over };
  db.jobs[j.id] = j;
  return j as unknown as Job;
};
const asDb = (d: ReturnType<typeof fakeDb>) => d as unknown as PrismaClient;
const RESULT = { duration: 30, bpm: 120, beats: [0.5], key: { key: 'A minor', mode: 'minor', tonic: 'A', confidence: 0.8 },
  sections: [{ index: 0, label: 'intro', start: 0, end: 10, energy: 0.2, confidence: 0.3 }, { index: 1, label: 'chorus', start: 10, end: 30, energy: 0.9, confidence: 0.5 }],
  drops: [{ t: 10, intensity: 0.7 }], energy: [{ t: 0, energy: 0.2 }] };

beforeEach(() => { analyze.mockReset(); storageGet.mockReset().mockResolvedValue(new Uint8Array([1])); });

describe('worker', () => {
  it('claims once, even if two workers race', async () => {
    const db = fakeDb(); addJob(db);
    const [a, b] = await Promise.all([claimNext(asDb(db)), claimNext(asDb(db))]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(db.jobs.j1.status).toBe('RUNNING'); expect(db.jobs.j1.attempts).toBe(1);
  });
  it('does not claim future jobs', async () => {
    const db = fakeDb(); addJob(db, { runAt: new Date(Date.now() + 60_000) });
    expect(await claimNext(asDb(db))).toBeNull();
  });
  it('saves a real analysis result and advances the project', async () => {
    const db = fakeDb(); addJob(db); analyze.mockResolvedValue(RESULT);
    await processJob(asDb(db), (await claimNext(asDb(db)))!);
    expect(db.jobs.j1.status).toBe('SUCCEEDED');
    expect(db.analyses.a1).toMatchObject({ status: 'COMPLETE', bpm: 120, key: 'A minor', durationSec: 30 });
    expect(db.sections.map((s) => s.label)).toEqual(['intro', 'chorus']);
    expect(db.analyses.a1.beatGrid).toEqual({ beats: [0.5], drops: [{ t: 10, intensity: 0.7 }] });
    expect(db.projects.p1).toMatchObject({ analysisId: 'a1', status: 'CONCEPTING' });
  });
  it('retries media-service outages with backoff, then fails after max attempts', async () => {
    const db = fakeDb(); addJob(db, { maxAttempts: 2 }); analyze.mockRejectedValue(new MediaApiError('unreachable', null, true));
    await processJob(asDb(db), (await claimNext(asDb(db)))!);
    expect(db.jobs.j1.status).toBe('QUEUED'); expect(db.jobs.j1.runAt.getTime()).toBeGreaterThan(Date.now());
    db.jobs.j1.runAt = new Date(0);
    await processJob(asDb(db), (await claimNext(asDb(db)))!);
    expect(db.jobs.j1.status).toBe('FAILED');
    expect(db.analyses.a1.status).toBe('FAILED'); expect(db.projects.p1.status).toBe('DRAFT');
  });
  it('fails immediately on non-retryable errors (bad audio)', async () => {
    const db = fakeDb(); addJob(db); analyze.mockRejectedValue(new MediaApiError('Media service 422: too short', 422, false));
    await processJob(asDb(db), (await claimNext(asDb(db)))!);
    expect(db.jobs.j1).toMatchObject({ status: 'FAILED', attempts: 1 }); expect(db.jobs.j1.error).toContain('too short');
  });
  it('discards results when the job was cancelled mid-run', async () => {
    const db = fakeDb(); addJob(db);
    analyze.mockImplementation(async () => { db.jobs.j1.status = 'CANCELLED'; return RESULT; });
    await processJob(asDb(db), (await claimNext(asDb(db)))!);
    expect(db.jobs.j1.status).toBe('CANCELLED'); expect(db.sections).toHaveLength(0); expect(db.analyses.a1.status).not.toBe('COMPLETE');
  });
  it('fails (not fakes) job types with no handler yet', async () => {
    const db = fakeDb(); addJob(db, { type: 'PROMO_CLIP' as never });
    await processJob(asDb(db), (await claimNext(asDb(db)))!);
    expect(db.jobs.j1.status).toBe('FAILED'); expect(db.jobs.j1.error).toMatch(/No worker handler/);
  });
  it('recovers jobs stuck RUNNING after a crash', async () => {
    const db = fakeDb(); const now = new Date();
    addJob(db, { status: 'RUNNING', startedAt: new Date(now.getTime() - STALE_MS - 1000), attempts: 1 });
    expect(await recoverStale(asDb(db), now)).toBe(1); expect(db.jobs.j1.status).toBe('QUEUED');
    db.jobs.j1.status = 'RUNNING'; db.jobs.j1.attempts = 3; db.jobs.j1.startedAt = new Date(now.getTime() - STALE_MS - 1000);
    await recoverStale(asDb(db), now); expect(db.jobs.j1.status).toBe('FAILED');
  });
});
