import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { assertSafeKey, LocalStorage, newStorageKey } from './storage';

describe('LocalStorage', () => {
  const s = new LocalStorage(mkdtempSync(path.join(tmpdir(), 'gs-')));
  it('round-trips and deletes', async () => {
    await s.put('projects/p1/audio/a.wav', new Uint8Array([1, 2, 3]));
    expect(await s.exists('projects/p1/audio/a.wav')).toBe(true);
    expect([...(await s.get('projects/p1/audio/a.wav'))]).toEqual([1, 2, 3]);
    expect(await s.size('projects/p1/audio/a.wav')).toBe(3);
    await s.delete('projects/p1/audio/a.wav');
    expect(await s.exists('projects/p1/audio/a.wav')).toBe(false);
    await s.delete('projects/p1/audio/a.wav'); // deleting twice is fine
  });
  it.each(['../x', 'a/../../x', '/etc/passwd', 'a//b', '', 'a\\b', './a', 'a/./b', 'a b'])('rejects unsafe key %j', (k) => {
    expect(() => assertSafeKey(k)).toThrow();
  });
  it('generated keys are always safe', () => {
    for (const name of ['../../evil.mp3', 'my song (final).wav', '....', 'ünïcode.mp3', 'a'.repeat(300) + '.wav']) {
      expect(() => assertSafeKey(newStorageKey('cabc123', 'audio', name))).not.toThrow();
    }
  });
});
