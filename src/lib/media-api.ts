import { getEnv } from './env';

export class MediaApiError extends Error {
  constructor(message: string, public status: number | null, public retryable: boolean) {
    super(message);
  }
}

function headers(): Record<string, string> {
  const t = getEnv().API_INTERNAL_TOKEN;
  return t ? { 'X-Internal-Token': t } : {};
}

async function call(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 30_000, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`${getEnv().API_URL}${path}`, { ...rest, headers: { ...headers(), ...(rest.headers as object) }, signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    throw new MediaApiError(`Media service unreachable: ${(e as Error).message}`, null, true);
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).detail ?? ''; } catch { /* non-JSON error body */ }
    throw new MediaApiError(`Media service ${res.status}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`.trim(), res.status, res.status >= 500 || res.status === 429);
  }
  return res.json();
}

export type AnalysisResult = {
  duration: number; bpm: number; beats: number[];
  key: { key: string; tonic: string; mode: string; confidence: number };
  sections: { index: number; label: string; start: number; end: number; energy: number; confidence: number }[];
  drops: { t: number; intensity: number }[];
  energy: { t: number; energy: number }[];
};

export type AlignedLine = { index: number; text: string; section?: string | null; start: number; end: number; words: { word: string; start: number; end: number; source?: string }[] };
export type AlignResult = { lines: AlignedLine[]; matched: number; total_words: number; coverage: number };
export type LyricVideoOptions = { template: string; aspect: '16:9' | '9:16' | '1:1'; quality: '1080p' | '4k'; preview: boolean; start?: number };
export type PromoSuggestion = { start: number; end: number; duration: number; score: number; reasons: string[]; platform: string };

export type DirectorAnalysis = { duration: number; bpm: number; key: { key: string }; sections: { label: string; start: number; end: number; energy: number }[]; drops: { t: number; intensity: number }[] };
export type Concept = { title: string; logline: string; mood: string; visual_style: string; color_palette: string[]; locations: string[]; treatment: string };
export type DirectorScene = { number: number; start: number; end: number; section?: string | null; lyrics?: string | null; description: string; location: string; characters: string[]; wardrobe?: string | null; vehicles: string[]; props: string[]; camera_angle: string; camera_movement: string; lighting: string; transition: string };

export const mediaApi = {
  promoSuggest: (body: { analysis: unknown; duration: number; count: number; platform: string }) =>
    call('/promo/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as Promise<{ clips: PromoSuggestion[] }>,
  providers: () => call('/providers') as Promise<{ providers: { name: string; kind: string; configured: boolean }[] }>,
  health: () => call('/health') as Promise<{ status: string; ffmpeg: { available: boolean } }>,
  async analyze(filename: string, data: Uint8Array, mimeType: string): Promise<AnalysisResult> {
    const fd = new FormData();
    fd.append('file', new Blob([data as BlobPart], { type: mimeType }), filename);
    return call('/analysis', { method: 'POST', body: fd, timeoutMs: 10 * 60_000 });
  },
  alignLyrics: (body: { lyrics: string; asr_words?: unknown[]; song_duration?: number }) =>
    call('/lyrics/align', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as Promise<AlignResult>,
  async transcribe(filename: string, data: Uint8Array, mimeType: string, language?: string) {
    const fd = new FormData();
    fd.append('file', new Blob([data as BlobPart], { type: mimeType }), filename);
    return call(`/lyrics/transcribe${language ? `?language=${encodeURIComponent(language)}` : ''}`, { method: 'POST', body: fd, timeoutMs: 20 * 60_000 }) as Promise<{ words: unknown[] }>;
  },
  /** Paths are storage keys (relative to the shared storage root); the media service refuses anything outside it. */
  renderLyricVideo: (body: { lines: unknown[]; audio: string; output: string; duration: number; background?: string } & LyricVideoOptions) =>
    call('/render/lyric-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 60 * 60_000 }) as Promise<{ output: string; duration: number }>,
  concepts: (body: { analysis: DirectorAnalysis; lyrics: string; instructions: string; count: number }) =>
    call('/director/concepts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 6 * 60_000 }) as Promise<{ concepts: Concept[] }>,
  storyboard: (body: { analysis: DirectorAnalysis; concept: Concept; lyrics: string; instructions: string }) =>
    call('/director/storyboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 10 * 60_000 }) as Promise<{ scenes: DirectorScene[] }>,
  generate: (body: { provider: string; kind: 'text_to_video' | 'image_to_video'; prompt: string; duration_sec?: number; image_url?: string; params?: Record<string, unknown> }) =>
    call('/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 120_000 }) as Promise<{ provider: string; job_id: string }>,
  generationStatus: (provider: string, jobId: string) =>
    call(`/generate/${encodeURIComponent(provider)}/${encodeURIComponent(jobId)}`) as Promise<{ state: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'; progress: number; output_urls: string[]; error: string | null }>,
  cancelGeneration: (provider: string, jobId: string) => call(`/generate/${encodeURIComponent(provider)}/${encodeURIComponent(jobId)}/cancel`, { method: 'POST' }),
  renderFinal: (body: { clips: { path: string; duration: number }[]; audio: string; output: string; aspect: string; quality: string; transition: string; preview: boolean }) =>
    call('/render', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeoutMs: 60 * 60_000 }) as Promise<{ output: string; duration: number }>,
};
