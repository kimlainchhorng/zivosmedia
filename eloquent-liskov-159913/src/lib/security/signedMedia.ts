/**
 * Signed-media helpers — replaces `getPublicUrl()` with short-lived signed URLs
 * for private storage buckets (chat media, call recordings, voice notes).
 *
 * Why: public buckets expose every uploaded file to anyone with the URL.
 * Signed URLs grant temporary, scoped access that expires automatically.
 *
 * Storage:
 * - Database rows store the **storage path** (e.g. "user-id/123.jpg"), not the URL
 * - When rendering, call `signedUrlFor(path)` to mint a fresh signed URL
 * - Cache signed URLs in memory for the rest of their lifetime to avoid re-signing
 */
import { supabase } from "@/integrations/supabase/client";

// Default TTLs by use case
export const SIGNED_URL_TTL = {
  display:   60 * 60,           // 1 hour — for inline image/video viewing
  download:  60 * 60 * 24,      // 24 hours — explicit user-initiated download
  thumbnail: 60 * 60 * 6,       // 6 hours — list/grid views
} as const;

export type SignedUrlPurpose = keyof typeof SIGNED_URL_TTL;

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CachedUrl>();

/**
 * Get a signed URL for a storage path. Cached for the URL's lifetime.
 * Returns empty string on error so callers can render a fallback.
 */
export async function signedUrlFor(
  bucket: string,
  path: string,
  purpose: SignedUrlPurpose = "display",
): Promise<string> {
  if (!path) return "";

  const ttlSec = SIGNED_URL_TTL[purpose];
  const key = `${bucket}::${path}::${purpose}`;
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > now + 60_000) {
    return cached.url; // still valid for >1 min
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSec);
  if (error || !data?.signedUrl) {
    console.warn("[signedMedia] failed to sign", bucket, path, error);
    return "";
  }

  cache.set(key, { url: data.signedUrl, expiresAt: now + ttlSec * 1000 });
  return data.signedUrl;
}

/**
 * Sign multiple paths in parallel. Returns array aligned with input order.
 */
export async function signedUrlsFor(
  bucket: string,
  paths: string[],
  purpose: SignedUrlPurpose = "display",
): Promise<string[]> {
  return Promise.all(paths.map(p => signedUrlFor(bucket, p, purpose)));
}

/**
 * Extract the storage path from a legacy public URL (for migration of old rows).
 * Public URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
 */
export function pathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Detect whether a value is already a storage path (vs a full URL).
 */
export function isStoragePath(value: string): boolean {
  return !!value && !value.startsWith("http://") && !value.startsWith("https://") && !value.startsWith("blob:") && !value.startsWith("data:");
}

/**
 * Clear the in-memory signed-URL cache (e.g. on sign-out).
 */
export function clearSignedUrlCache(): void {
  cache.clear();
}
