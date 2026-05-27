/**
 * Optimize Supabase Storage avatar URLs using Image Transformation API.
 * Converts `/object/public/` URLs to `/render/image/public/` with resize params.
 * Non-Supabase URLs are returned unchanged.
 */
const SUPABASE_STORAGE = "supabase.co/storage/v1/object/public/";

export function optimizeAvatar(
  url: string | null | undefined,
  size: number = 96
): string | undefined {
  if (!url) return undefined;

  // Only transform Supabase storage URLs
  if (!url.includes(SUPABASE_STORAGE)) return url;

  // Replace /object/public/ with /render/image/public/ and add resize params
  const transformed = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}width=${size}&height=${size}&resize=cover&quality=75`;
}
