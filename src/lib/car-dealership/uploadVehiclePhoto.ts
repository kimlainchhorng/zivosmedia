/**
 * Vehicle photo upload — writes to the shared `store-assets` bucket using a
 * folder layout that satisfies the bucket's `<storeId>/...` RLS policy:
 *
 *     <storeId>/vehicle-photos/<vehicleId>/<timestamp>-<random>.<ext>
 *
 * For "new" vehicles (no ID yet), the caller passes a client-generated UUID
 * for `vehicleId`; the folder is created opportunistically and any photos
 * uploaded against an abandoned draft remain as orphans (cheap, acceptable).
 *
 * Returns the public URL on success.
 */
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "store-assets";

interface UploadParams {
  storeId: string;
  vehicleId: string; // real UUID or a temp client-generated UUID for new drafts
  file: File;
}

export async function uploadVehiclePhoto({ storeId, vehicleId, file }: UploadParams): Promise<string> {
  if (!storeId) throw new Error("Photo upload failed: missing store id");
  if (!vehicleId) throw new Error("Photo upload failed: missing vehicle id");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${storeId}/vehicle-photos/${vehicleId}/${stamp}-${rand}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });

  if (upErr) {
    throw new Error(`Photo upload failed: ${upErr.message}`);
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
}

/**
 * Best-effort delete — used when the user removes a photo from a vehicle.
 * If the URL doesn't belong to our bucket (e.g. pasted external URL),
 * the function returns silently without throwing.
 */
export async function deleteVehiclePhoto(publicUrl: string): Promise<void> {
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // external URL — nothing to do
  const path = publicUrl.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]).catch((e) => {
    console.warn("[deleteVehiclePhoto] storage remove failed:", e);
  });
}
