import { supabase } from "@/integrations/supabase/client";

/**
 * Normalize a store post media URL — handles relative bucket paths,
 * legacy storage API prefixes, and full public URLs.
 */
export function normalizeStorePostMediaUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:")) return url;

  let cleaned = url.trim();
  cleaned = cleaned.replace(/^\/+/, "");
  cleaned = cleaned.replace(/^storage\/v1\/object\/public\/store-posts\//, "");
  cleaned = cleaned.replace(/^store-posts\//, "");

  return supabase.storage.from("store-posts").getPublicUrl(cleaned).data.publicUrl;
}
