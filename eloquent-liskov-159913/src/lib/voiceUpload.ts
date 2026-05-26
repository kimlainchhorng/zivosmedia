/**
 * voiceUpload — XHR-based upload to Supabase Storage with progress + abort support,
 * plus a small retry-with-backoff helper.
 *
 * Why XHR? supabase-js's storage `upload()` doesn't expose progress events.
 * For voice notes we want a per-bubble progress bar, so we POST directly to the
 * Storage REST endpoint with the user's session access token.
 *
 * Notes on Storage REST semantics:
 *   - POST  /object/{bucket}/{path}  → create a new object (matches the
 *     bucket's INSERT RLS policy). This is what `supabase.storage.upload()`
 *     uses by default.
 *   - PUT   /object/{bucket}/{path}  → overwrite an existing object (requires
 *     an UPDATE RLS policy). The chat-media-files bucket only grants INSERT
 *     and DELETE to authenticated users, so PUT will RLS-fail.
 *
 * Voice notes always use a unique path (timestamp + random id), so POST is
 * safe and matches the existing storage policy.
 */
import { supabase, SUPABASE_URL as CLIENT_SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY as CLIENT_SUPABASE_KEY } from "@/integrations/supabase/client";

export interface UploadVoiceOpts {
  blob: Blob;
  bucket: string;
  path: string;
  contentType?: string;
  cacheControl?: string;
  signal?: AbortSignal;
  onProgress?: (ratio: number) => void;
}

export interface UploadVoiceResult {
  publicUrl: string;
  path: string;
}

// Always prefer the values exported by the connected Supabase client (which are
// hard-coded for the connected project) and fall back to env vars only if for
// some reason they are missing. This avoids env-only fragility.
const SUPABASE_URL = (CLIENT_SUPABASE_URL || (import.meta.env.VITE_SUPABASE_URL as string) || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (CLIENT_SUPABASE_KEY || (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "");
export const MAX_INLINE_VOICE_BYTES = 768 * 1024;

export function shouldInlineVoiceBlob(blob: Blob): boolean {
  return blob.size > 0 && blob.size <= MAX_INLINE_VOICE_BYTES;
}

export function blobToDataUrl(blob: Blob, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new UploadAbortedError());
    const reader = new FileReader();
    const onAbort = () => {
      try { reader.abort(); } catch { /* noop */ }
      reject(new UploadAbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    reader.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      resolve(String(reader.result || ""));
    };
    reader.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(reader.error || new Error("Could not encode voice note"));
    };
    reader.readAsDataURL(blob);
  });
}

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload aborted");
    this.name = "UploadAbortedError";
  }
}

export class UploadHttpError extends Error {
  status: number;
  retriable: boolean;
  url?: string;
  phase?: "preflight" | "upload" | "insert";
  body?: string;
  /** Server-supplied Retry-After in milliseconds (parsed from header). */
  retryAfterMs?: number;
  constructor(status: number, message: string, url?: string, body?: string, retryAfterMs?: number) {
    super(message);
    this.name = "UploadHttpError";
    this.status = status;
    this.url = url;
    this.body = body;
    this.retryAfterMs = retryAfterMs;
    // 408 timeout, 429 rate limit, 5xx — safe to retry
    this.retriable = status === 408 || status === 429 || (status >= 500 && status < 600);
  }
}

/** Returns environment-level diagnostics for the voice upload pipeline. */
export function getVoiceUploadDiagnostics(): {
  hasAnonKey: boolean;
  supabaseUrl: string;
} {
  return {
    hasAnonKey: !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 20,
    supabaseUrl: SUPABASE_URL || "",
  };
}

export interface PreflightResult {
  ok: boolean;
  status: number;
  url: string;
  reason?: string;
  body?: string;
}

// Cache successful write-preflight per bucket — persisted in sessionStorage so
// HMR hot reloads (which re-execute this module) don't blow away the proof that
// the bucket allows writes and trigger spurious preflight failures.
const PREFLIGHT_CACHE_KEY = "_vmp_preflight";
const PREFLIGHT_TTL_MS = 5 * 60 * 1000;

function _loadPreflightCache(): Map<string, number> {
  try {
    const raw = sessionStorage.getItem(PREFLIGHT_CACHE_KEY);
    if (raw) return new Map(JSON.parse(raw) as [string, number][]);
  } catch { /* ignore */ }
  return new Map();
}

function _savePreflightCache(cache: Map<string, number>) {
  try {
    sessionStorage.setItem(PREFLIGHT_CACHE_KEY, JSON.stringify([...cache]));
  } catch { /* ignore — storage full or private browsing */ }
}

const preflightOkCache = _loadPreflightCache();

/**
 * Real write-preflight: POSTs a 1-byte probe object into the user's own folder
 * inside the target bucket and immediately deletes it. This actually exercises
 * the INSERT RLS policy, so a failure here is a guaranteed indicator that
 * the real upload would also fail.
 *
 * Network errors are NOT treated as a failure — we let the actual upload
 * surface the real error. Only HTTP 4xx/5xx responses block.
 */
export async function preflightVoiceBucket(opts: {
  bucket: string;
  path: string;
  signal?: AbortSignal;
}): Promise<PreflightResult> {
  const { bucket, signal } = opts;

  const cachedAt = preflightOkCache.get(bucket);
  if (cachedAt && Date.now() - cachedAt < PREFLIGHT_TTL_MS) {
    return { ok: true, status: 200, url: `${SUPABASE_URL}/storage/v1/object/${bucket}/<cached>` };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const userId = sessionData.session?.user?.id;
  if (!accessToken || !userId) {
    return {
      ok: false,
      status: 401,
      url: `${SUPABASE_URL}/storage/v1/object/${bucket}/`,
      reason: "Not authenticated — please sign in again.",
    };
  }

  const probePath = `${userId}/.preflight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(probePath)}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "text/plain",
  };
  if (SUPABASE_ANON_KEY) headers["apikey"] = SUPABASE_ANON_KEY;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: "preflight",
      signal,
    });
    if (res.ok) {
      preflightOkCache.set(bucket, Date.now());
      _savePreflightCache(preflightOkCache);
      // Best-effort cleanup of the probe object.
      void supabase.storage.from(bucket).remove([probePath]).catch(() => {});
      return { ok: true, status: res.status, url };
    }
    const body = await res.text().catch(() => "");
    // 5xx = transient/server-side issue (e.g. storage DatabaseError 08P01).
    // Don't block — let the real upload attempt surface the actual outcome.
    if (res.status >= 500) {
      return { ok: true, status: res.status, url };
    }
    let reason = `Storage write blocked (HTTP ${res.status}). RLS or bucket policy denied the upload.`;
    if (res.status === 401) reason = "Not authorized to upload (HTTP 401). Sign in again.";
    if (res.status === 403) reason = `Storage RLS denied write to '${bucket}' (HTTP 403). Check bucket INSERT policy.`;
    if (res.status === 404) reason = `Storage bucket '${bucket}' not found (HTTP 404).`;
    return { ok: false, status: res.status, url, reason, body };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new UploadAbortedError();
    }
    // Network / CORS — don't block; the real PUT will surface the error.
    return { ok: true, status: 0, url };
  }
}


export async function uploadVoiceWithProgress(opts: UploadVoiceOpts): Promise<UploadVoiceResult> {
  const { blob, bucket, path, contentType, cacheControl = "3600", signal, onProgress } = opts;

  if (signal?.aborted) throw new UploadAbortedError();

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("Not authenticated");

  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeURI(path)}`;

  return await new Promise<UploadVoiceResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // POST = create new object (matches the bucket's INSERT RLS policy).
    // Voice paths are always unique (timestamp + random id), so we never need
    // upsert/PUT semantics here.
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    if (SUPABASE_ANON_KEY) xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("cache-control", `max-age=${cacheControl}`);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);

    const onAbort = () => {
      try { xhr.abort(); } catch { /* noop */ }
    };
    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return;
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        onProgress?.(1);
        resolve({ publicUrl: data.publicUrl, path });
      } else {
        const body = xhr.responseText || "";
        let msg = `HTTP ${xhr.status}`;
        try {
          const parsed = body ? JSON.parse(body) : null;
          if (parsed?.message) msg = `${msg}: ${parsed.message}`;
          else if (parsed?.error) msg = `${msg}: ${parsed.error}`;
          else if (body) msg = `${msg}: ${body.slice(0, 160)}`;
        } catch {
          if (body) msg = `${msg}: ${body.slice(0, 160)}`;
        }
        // Parse Retry-After header (seconds or HTTP-date) for 429/503.
        let retryAfterMs: number | undefined;
        const ra = xhr.getResponseHeader("Retry-After");
        if (ra) {
          const asInt = parseInt(ra, 10);
          if (!Number.isNaN(asInt)) retryAfterMs = asInt * 1000;
          else {
            const asDate = Date.parse(ra);
            if (!Number.isNaN(asDate)) retryAfterMs = Math.max(0, asDate - Date.now());
          }
        }
        const err = new UploadHttpError(xhr.status, msg, url, body, retryAfterMs);
        err.phase = "upload";
        reject(err);
      }
    };
    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      // Network-level failure — retriable
      const err = new UploadHttpError(0, "Network error", url);
      err.retriable = true;
      err.phase = "upload";
      reject(err);
    };
    xhr.onabort = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new UploadAbortedError());
    };

    try {
      xhr.send(blob);
    } catch (e) {
      reject(e);
    }
  });
}

export interface RetryOpts {
  attempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  isRetriable?: (err: unknown) => boolean;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new UploadAbortedError());
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new UploadAbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });

const defaultIsRetriable = (err: unknown): boolean => {
  if (err instanceof UploadAbortedError) return false;
  if (err instanceof UploadHttpError) return err.retriable;
  // Generic Error from supabase-js insert: retry network-ish errors only
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (!msg) return false;
  return (
    msg.includes("databaseerror") ||
    msg.includes("database error") ||
    msg.includes("08p01") ||
    msg.includes("too many connections") ||
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("temporar") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("504")
  );
};

export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const base = opts.baseDelayMs ?? 600;
  const isRetriable = opts.isRetriable ?? defaultIsRetriable;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    if (opts.signal?.aborted) throw new UploadAbortedError();
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (err instanceof UploadAbortedError) throw err;
      if (i === attempts - 1 || !isRetriable(err)) throw err;
      const jitter = Math.random() * 200;
      // Storage/database pressure → respect Retry-After (or use a longer
      // backoff while the database recovers): 1.5s → 3s → 6s → 12s.
      let delay: number;
      const isStorageBusy = err instanceof UploadHttpError && (
        err.status === 429 ||
        (err.status >= 500 && /databaseerror|08p01|too many connections/i.test(err.body || err.message))
      );
      if (isStorageBusy) {
        const ra = err.retryAfterMs ?? 0;
        delay = Math.max(ra, 1500 * Math.pow(2, i)) + jitter;
      } else {
        delay = base * Math.pow(2.2, i) + jitter;
      }
      await sleep(delay, opts.signal);
    }
  }
  throw lastErr;
}
