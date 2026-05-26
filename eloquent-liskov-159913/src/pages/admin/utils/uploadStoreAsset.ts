import { supabase } from "@/integrations/supabase/client";

export type UploadSurface = "gallery" | "logo" | "cover" | "room";

interface UploadStoreAssetParams {
  storeId: string;
  file: File;
  surface: UploadSurface;
  /** Optional explicit filename (without extension). Defaults to a surface-specific name. */
  filename?: string;
}

interface UploadStoreAssetResult {
  path: string;
  publicUrl: string;
}

const surfaceLabel: Record<UploadSurface, string> = {
  gallery: "Gallery",
  logo: "Profile image",
  cover: "Cover image",
  room: "Room image",
};

/**
 * Uploads a file to the `store-assets` bucket using the storeId-first folder
 * layout required by the bucket's RLS policy:
 *   - gallery / logo / cover -> `<storeId>/<file>`
 *   - room (product image)   -> `<storeId>/products/<file>`
 *
 * After the upload it verifies the object exists by listing the parent folder
 * and HEAD-fetching the public URL. Throws a labeled error on any failure.
 */
export async function uploadStoreAsset({
  storeId,
  file,
  surface,
  filename,
}: UploadStoreAssetParams): Promise<UploadStoreAssetResult> {
  const label = surfaceLabel[surface];
  if (!storeId) {
    throw new Error(`${label} upload failed: missing store id`);
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const stamp = Date.now();
  let baseName: string;
  switch (surface) {
    case "gallery":
      baseName = filename ? `${filename}.${ext}` : `gallery-${stamp}.${ext}`;
      break;
    case "logo":
      baseName = filename ? `${filename}.${ext}` : `logo-${stamp}.${ext}`;
      break;
    case "cover":
      baseName = filename ? `${filename}.${ext}` : `cover-${stamp}.${ext}`;
      break;
    case "room":
      baseName = filename ? `${filename}.${ext}` : `${stamp}.${ext}`;
      break;
  }

  const folder = surface === "room" ? `${storeId}/products` : `${storeId}`;
  const path = `${folder}/${baseName}`;

  // 1) Upload
  const { error: upErr } = await supabase.storage
    .from("store-assets")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) {
    throw new Error(`${label} upload failed: ${upErr.message}`);
  }

  // 2) Verify object exists in the parent folder
  try {
    const { data: listed, error: listErr } = await supabase.storage
      .from("store-assets")
      .list(folder, { limit: 100, search: baseName });
    if (listErr) {
      // Listing failure is non-fatal; we'll still try the HEAD check.
      console.warn(`[uploadStoreAsset] list(${folder}) failed:`, listErr.message);
    } else if (!listed?.some((o) => o.name === baseName)) {
      throw new Error("file not found after upload");
    }
  } catch (e: any) {
    throw new Error(`${label} upload failed: ${e?.message || "verification failed"}`);
  }

  // 3) Public URL + HEAD verification
  const { data: urlData } = supabase.storage.from("store-assets").getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  try {
    const head = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
    if (!head.ok) {
      throw new Error(`public URL returned ${head.status}`);
    }
  } catch (e: any) {
    // Network errors shouldn't block the upload outright, but surface them.
    console.warn(`[uploadStoreAsset] HEAD ${publicUrl} failed:`, e?.message);
  }

  return { path, publicUrl };
}

/**
 * Re-fetch a single column on `store_profiles` and confirm the URL was saved.
 * Returns true when the persisted value matches `expectedUrl`.
 */
export async function verifyStoreProfileUrl(
  storeId: string,
  field: "logo_url" | "banner_url",
  expectedUrl: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("store_profiles")
    .select(field)
    .eq("id", storeId)
    .maybeSingle();
  if (error || !data) return false;
  return (data as Record<string, unknown>)[field] === expectedUrl;
}

/**
 * Re-fetch `gallery_images` and confirm the array matches.
 */
export async function verifyStoreProfileGallery(
  storeId: string,
  expected: string[],
): Promise<boolean> {
  const { data, error } = await supabase
    .from("store_profiles")
    .select("gallery_images")
    .eq("id", storeId)
    .maybeSingle();
  if (error || !data) return false;
  const stored = ((data as any).gallery_images as string[]) || [];
  if (stored.length !== expected.length) return false;
  return stored.every((u, i) => u === expected[i]);
}
