/**
 * Expense-receipt upload — writes to the shared `store-assets` bucket using
 * the storeId-first folder layout the bucket's RLS policy requires:
 *
 *     <storeId>/expense-receipts/<timestamp>-<sanitized-filename>
 *
 * The expense row may not exist yet at upload time (create flow), so the
 * path is keyed on a timestamp rather than the expense id.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "store-assets";

interface UploadParams {
  storeId: string;
  file: File;
}

export interface UploadedExpenseReceipt {
  path: string;
  publicUrl: string;
}

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

export async function uploadExpenseReceipt({
  storeId, file,
}: UploadParams): Promise<UploadedExpenseReceipt> {
  if (!storeId) throw new Error("Receipt upload failed: missing store id");

  const stamp = Date.now();
  const safeName = sanitizeFileName(file.name);
  const path = `${storeId}/expense-receipts/${stamp}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (upErr) {
    throw new Error(`Receipt upload failed: ${upErr.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: urlData.publicUrl };
}

/**
 * Best-effort delete of a previously uploaded receipt. The caller has
 * already cleared the metadata, so a storage orphan is the only fallout.
 */
export async function deleteExpenseReceipt(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  // Convert public URL back to storage path. Public URLs end with
  //   /storage/v1/object/public/<bucket>/<path>
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx < 0) return;
  const path = publicUrl.slice(idx + marker.length);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn("[deleteExpenseReceipt] storage remove failed:", error.message);
  }
}
