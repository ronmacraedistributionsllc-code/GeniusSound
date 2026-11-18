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

export const mediaApi = {
  providers: () => call('/providers') as Promise<{ providers: { name: string; kind: string; configured: boolean }[] }>,
  health: () => call('/health') as Promise<{ status: string; ffmpeg: { available: boolean } }>,
  async analyze(filename: string, data: Uint8Array, mimeType: string): Promise<AnalysisResult> {
    const fd = new FormData();
    fd.append('file', new Blob([data as BlobPart], { type: mimeType }), filename);
    return call('/analysis', { method: 'POST', body: fd, timeoutMs: 10 * 60_000 });
  },
};
