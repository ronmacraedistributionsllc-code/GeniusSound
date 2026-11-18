import { describe, expect, it } from 'vitest';
import { AudioValidationError, audioMimeForName, sniffAudio, validateAudio } from './audio-file';

function wav(seconds: number, rate = 8000): Uint8Array {
  const n = seconds * rate;
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return new Uint8Array(b);
}

describe('audio validation', () => {
  it('accepts a real WAV and reads its duration', async () => {
    const r = await validateAudio('song.WAV', wav(3));
    expect(r.mimeType).toBe('audio/wav');
    expect(r.durationSec).toBeCloseTo(3, 1);
  });
  it('maps extensions', () => {
    expect(audioMimeForName('a.mp3')).toBe('audio/mpeg');
    expect(audioMimeForName('a.ogg')).toBeNull();
    expect(audioMimeForName('noext')).toBeNull();
  });
  it('sniffs content, not just names', () => {
    expect(sniffAudio(Buffer.from('ID3\x04\x00\x00\x00\x00\x00\x00\x00\x00'))).toBe('audio/mpeg');
    expect(sniffAudio(Buffer.from('MZ-this-is-an-exe-file'))).toBeNull();
  });
  it('rejects wrong extension, disguised files, empty and too-short audio', async () => {
    await expect(validateAudio('a.ogg', wav(3))).rejects.toThrow(AudioValidationError);
    await expect(validateAudio('a.mp3', wav(3))).rejects.toThrow(/does not match/);
    await expect(validateAudio('a.wav', new Uint8Array(0))).rejects.toThrow(/empty/);
    await expect(validateAudio('a.wav', Buffer.from('<?php echo 1; ?> not audio at all'))).rejects.toThrow(AudioValidationError);
  });
});
