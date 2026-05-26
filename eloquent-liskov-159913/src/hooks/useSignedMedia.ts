/**
 * useSignedMedia — resolves a storage path or legacy public URL to a viewable URL.
 *
 * - If `value` is null/empty → returns null
 * - If `value` is a full http(s) URL (legacy rows) → returns it unchanged
 * - If `value` looks like a storage path → mints a short-lived signed URL
 *
 * This lets components migrate gradually: new uploads store paths, old rows
 * with public URLs continue to render until they're backfilled.
 */
import { useEffect, useState } from "react";
import {
  signedUrlFor,
  isStoragePath,
  pathFromPublicUrl,
  type SignedUrlPurpose,
} from "@/lib/security/signedMedia";

export function useSignedMedia(
  value: string | null | undefined,
  bucket: string,
  purpose: SignedUrlPurpose = "display",
): string | null {
  const [resolved, setResolved] = useState<string | null>(() => {
    if (!value) return null;
    return isStoragePath(value) ? null : value; // legacy URL passes through
  });

  useEffect(() => {
    if (!value) {
      setResolved(null);
      return;
    }

    // Already a full URL (legacy public URL or already-signed) — render as-is.
    if (!isStoragePath(value)) {
      // If it's a legacy public URL for this bucket, re-sign for safety.
      const path = pathFromPublicUrl(value, bucket);
      if (path) {
        let cancelled = false;
        signedUrlFor(bucket, path, purpose).then(url => {
          if (!cancelled) setResolved(url || value);
        });
        return () => { cancelled = true; };
      }
      setResolved(value);
      return;
    }

    // Storage path → mint signed URL
    let cancelled = false;
    signedUrlFor(bucket, value, purpose).then(url => {
      if (!cancelled) setResolved(url || null);
    });
    return () => { cancelled = true; };
  }, [value, bucket, purpose]);

  return resolved;
}
