import { promises as fs } from 'fs';
import path from 'path';
import { getEnv } from './env';

export interface Storage {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  size(key: string): Promise<number>;
}

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

/** Reject anything that could escape the storage root. */
export function assertSafeKey(key: string): void {
  if (!KEY_RE.test(key) || key.split('/').some((p) => p === '..' || p === '' || p === '.')) {
    throw new Error(`Unsafe storage key: ${key}`);
  }
}

export class LocalStorage implements Storage {
  private root: string;
  constructor(root: string) {
    this.root = path.resolve(root);
  }
  private full(key: string): string {
    assertSafeKey(key);
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root + path.sep)) throw new Error(`Unsafe storage key: ${key}`);
    return p;
  }
  async put(key: string, data: Uint8Array) {
    const p = this.full(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, data);
  }
  get(key: string) {
    return fs.readFile(this.full(key));
  }
  async exists(key: string) {
    try {
      await fs.access(this.full(key));
      return true;
    } catch {
      return false;
    }
  }
  async delete(key: string) {
    await fs.rm(this.full(key), { force: true });
  }
  async size(key: string) {
    return (await fs.stat(this.full(key))).size;
  }
}

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  const env = getEnv();
  if (env.STORAGE_DRIVER === 's3') {
    throw new Error('STORAGE_DRIVER=s3 is not implemented yet. Use STORAGE_DRIVER=local.');
  }
  instance = new LocalStorage(env.STORAGE_LOCAL_ROOT);
  return instance;
}

export function newStorageKey(projectId: string, kind: string, filename: string): string {
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+/, '').slice(-80) || 'file';
  return `projects/${projectId}/${kind}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
