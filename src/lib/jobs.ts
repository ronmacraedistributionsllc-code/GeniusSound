import { db } from './db';

/** Jobs that have sat QUEUED for over a minute — usually means the worker isn't running. */
export function countStuckJobs(olderThanMs = 60_000): Promise<number> {
  return db.job.count({ where: { status: 'QUEUED', createdAt: { lt: new Date(Date.now() - olderThanMs) } } });
}
