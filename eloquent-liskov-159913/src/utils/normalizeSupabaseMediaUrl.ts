import { supabase } from "@/integrations/supabase/client";

type NormalizeOptions = {
  preferredBucket?: string;
};

const KNOWN_PUBLIC_MEDIA_BUCKETS = new Set([
  "store-posts",
  "user-posts",
  "user-stories",
  "store-assets",
  "marketplace-photos",
  "channel-media",
  "chat-media-files",
  "part-images",
  "cv-photos",
  "driver-documents",
  "job-resumes",
]);

function toPublicUrl(bucket: string, objectPath: string): string {
  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

/**
 * Normalize media URLs stored in Supabase records.
 * Supports absolute URLs, legacy public storage paths, and bucket-prefixed paths.
 */
export function normalizeSupabaseMediaUrl(url: string, options: NormalizeOptions = {}): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const cleaned = trimmed.replace(/^\/+/, "");

  // Matches: storage/v1/object/public/<bucket>/<path>
  const storagePublicMatch = cleaned.match(/^storage\/v1\/object\/public\/([^/]+)\/(.+)$/i);
  if (storagePublicMatch) {
    const [, bucket, objectPath] = storagePublicMatch;
    if (bucket && objectPath) return toPublicUrl(bucket, objectPath);
  }

  // Matches direct bucket-prefixed paths like: user-posts/<path>
  const firstSlash = cleaned.indexOf("/");
  if (firstSlash > 0) {
    const bucket = cleaned.slice(0, firstSlash);
    const objectPath = cleaned.slice(firstSlash + 1);
    if (KNOWN_PUBLIC_MEDIA_BUCKETS.has(bucket) && objectPath) {
      return toPublicUrl(bucket, objectPath);
    }
  }

  // For short relative paths, callers can provide the expected bucket.
  if (options.preferredBucket && cleaned && !cleaned.startsWith("http")) {
    return toPublicUrl(options.preferredBucket, cleaned);
  }

  return trimmed.startsWith("/") ? trimmed : `/${cleaned}`;
}