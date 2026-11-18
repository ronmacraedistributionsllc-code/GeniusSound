import { parseBuffer } from 'music-metadata';

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const EXT = new Map([['.mp3', 'audio/mpeg'], ['.wav', 'audio/wav']]);

export class AudioValidationError extends Error {}

export function audioMimeForName(name: string): string | null {
  const m = /\.[^.]+$/.exec(name.toLowerCase());
  return (m && EXT.get(m[0])) || null;
}

/** MP3 = ID3 tag or MPEG frame sync; WAV = RIFF....WAVE. Checks content, not just the filename. */
export function sniffAudio(buf: Uint8Array): 'audio/mpeg' | 'audio/wav' | null {
  if (buf.length < 12) return null;
  const s = (a: number, b: number) => String.fromCharCode(...buf.slice(a, b));
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return 'audio/wav';
  if (s(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'audio/mpeg';
  return null;
}

export async function validateAudio(filename: string, data: Uint8Array): Promise<{ mimeType: string; durationSec: number }> {
  const byName = audioMimeForName(filename);
  if (!byName) throw new AudioValidationError('Only MP3 and WAV files are supported');
  if (data.length === 0) throw new AudioValidationError('File is empty');
  if (data.length > MAX_AUDIO_BYTES) throw new AudioValidationError('File is too large (100 MB max)');
  const sniffed = sniffAudio(data);
  if (!sniffed || sniffed !== byName) throw new AudioValidationError('File content does not match an MP3 or WAV file');
  let duration: number | undefined;
  try {
    duration = (await parseBuffer(data, { mimeType: byName })).format.duration;
  } catch {
    throw new AudioValidationError('Could not read this audio file (corrupt or unsupported)');
  }
  if (!duration || duration < 1) throw new AudioValidationError('Audio is too short to analyze (minimum 1 second)');
  return { mimeType: byName, durationSec: duration };
}
