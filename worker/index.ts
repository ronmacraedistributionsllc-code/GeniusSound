import { db } from '../src/lib/db';
import { getEnv } from '../src/lib/env';
import { claimNext, processJob, recoverStale } from './runner';

const env = getEnv();
let stopping = false;
let active = 0;

async function tick() {
  while (!stopping && active < env.WORKER_CONCURRENCY) {
    const job = await claimNext(db);
    if (!job) return;
    active++;
    processJob(db, job)
      .catch((e) => console.error('[worker] unexpected error', e))
      .finally(() => { active--; });
  }
}

async function main() {
  console.log(`[worker] started (concurrency ${env.WORKER_CONCURRENCY}, poll ${env.WORKER_POLL_MS}ms, media API ${env.API_URL})`);
  const n = await recoverStale(db);
  if (n) console.log(`[worker] recovered ${n} stale job(s)`);
  let lastRecover = Date.now();
  while (!stopping) {
    try {
      await tick();
      if (Date.now() - lastRecover > 60_000) { await recoverStale(db); lastRecover = Date.now(); }
    } catch (e) {
      console.error('[worker] loop error (will retry)', e);
    }
    await new Promise((r) => setTimeout(r, env.WORKER_POLL_MS));
  }
  while (active > 0) await new Promise((r) => setTimeout(r, 200));
  await db.$disconnect();
  console.log('[worker] stopped');
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { console.log(`[worker] ${sig}, finishing active jobs…`); stopping = true; });
main().catch((e) => { console.error('[worker] fatal', e); process.exit(1); });
