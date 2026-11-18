/** Browser-side JSON fetch that turns API error bodies into readable Errors. */
export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const res = await fetch(path, {
    ...init,
    headers: isForm ? init.headers : { 'Content-Type': 'application/json', ...(init.headers as object) },
    body: init.body && !isForm && typeof init.body !== 'string' ? JSON.stringify(init.body) : init.body,
  });
  let data: unknown = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const d = data as { error?: string; details?: string[] } | null;
    throw new Error([d?.error ?? `Request failed (${res.status})`, ...(d?.details ?? [])].join(': '));
  }
  return data as T;
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export const fmtBytes = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

/** multipart upload with progress (fetch can't report upload progress). */
export function uploadWithProgress<T>(url: string, form: FormData, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onload = () => {
      let data: { error?: string } & Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new Error(data.error ?? `Upload failed (${xhr.status})`));
    };
    xhr.send(form);
  });
}

type Jsonify<T> = T extends Date ? string : T extends (infer U)[] ? Jsonify<U>[] : T extends object ? { [K in keyof T]: Jsonify<T[K]> } : T;

/** Make server data safe to hand to a client component (Dates become ISO strings). */
export const plain = <T,>(v: T): Jsonify<T> => JSON.parse(JSON.stringify(v));
