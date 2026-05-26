/**
 * Deal-document upload — writes to the shared `store-assets` bucket using
 * the storeId-first folder layout the bucket's RLS policy requires:
 *
 *     <storeId>/deal-documents/<dealId>/<timestamp>-<sanitized-filename>
 *
 * Returns both the public URL (for download links in the UI) and the
 * storage path (for later deletion).
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "store-assets";

interface UploadParams {
  storeId: string;
  dealId: string;
  file: File;
}

export interface UploadedDealDocument {
  path: string;
  publicUrl: string;
}

// Sanitize filename — drop weird chars, collapse whitespace, lowercase ext.
function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const stem = (lastDot > 0 ? name.slice(0, lastDot) : name)
    .replace(/[^\w\-.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const ext = (lastDot > 0 ? name.slice(lastDot + 1) : "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  return `${stem || "file"}.${ext || "bin"}`;
}

export async function uploadDealDocument({
  storeId, dealId, file,
}: UploadParams): Promise<UploadedDealDocument> {
  if (!storeId) throw new Error("Document upload failed: missing store id");
  if (!dealId) throw new Error("Document upload failed: missing deal id");

  const stamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const path = `${storeId}/deal-documents/${dealId}/${stamp}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (upErr) {
    throw new Error(`Document upload failed: ${upErr.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: urlData.publicUrl };
}

/**
 * Best-effort delete of a previously uploaded document.
 * Failures are logged but not thrown — the calling code already removed
 * the metadata row, so a storage orphan is the only consequence.
 */
export async function deleteDealDocument(path: string): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn("[deleteDealDocument] storage remove failed:", error.message);
  }
}
