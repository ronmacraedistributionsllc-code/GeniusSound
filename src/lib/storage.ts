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

export class S3Storage implements Storage {
  private s3Client: any;
  private bucket: string;

  constructor(endpoint: string, bucket: string, accessKeyId: string, secretAccessKey: string) {
    // Lazy load AWS SDK
    const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

    this.bucket = bucket;
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    assertSafeKey(key);
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
    });
    await this.s3Client.send(command);
  }

  async get(key: string): Promise<Buffer> {
    assertSafeKey(key);
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async exists(key: string): Promise<boolean> {
    assertSafeKey(key);
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (e: any) {
      if (e.name === 'NotFound') return false;
      throw e;
    }
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  async size(key: string): Promise<number> {
    assertSafeKey(key);
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.s3Client.send(command);
    return response.ContentLength || 0;
  }
}

let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  const env = getEnv();
  if (env.STORAGE_DRIVER === 's3') {
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 storage configured but missing S3_ENDPOINT, S3_ACCESS_KEY_ID, or S3_SECRET_ACCESS_KEY in .env');
    }
    instance = new S3Storage(env.S3_ENDPOINT, env.S3_BUCKET, env.S3_ACCESS_KEY_ID, env.S3_SECRET_ACCESS_KEY);
  } else {
    instance = new LocalStorage(env.STORAGE_LOCAL_ROOT);
  }
  return instance;
}

export function newStorageKey(projectId: string, kind: string, filename: string): string {
  const safe = filename.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._]+/, '').slice(-80) || 'file';
  return `projects/${projectId}/${kind}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
