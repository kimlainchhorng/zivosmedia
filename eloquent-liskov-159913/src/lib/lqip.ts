/**
 * LQIP (Low-Quality Image Placeholder) helpers for room photos.
 * Detects Supabase Storage URLs and rewrites them to a tiny render-transform
 * variant so we can blur it underneath the full image while it loads.
 */

const SUPABASE_PUBLIC_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";

export function getLqipUrl(src: string | undefined | null): string | null {
  if (!src) return null;
  try {
    const url = new URL(src);
    if (!url.pathname.includes(SUPABASE_PUBLIC_PATH) && !url.pathname.includes(SUPABASE_RENDER_PATH)) {
      return null;
    }
    // Normalize to the render path
    url.pathname = url.pathname.replace(SUPABASE_PUBLIC_PATH, SUPABASE_RENDER_PATH);
    url.searchParams.set("width", "24");
    url.searchParams.set("quality", "20");
    url.searchParams.set("resize", "contain");
    return url.toString();
  } catch {
    return null;
  }
}

/** Infer a human caption from a filename (strips extension, replaces -/_ with spaces, title-cases). */
export function inferCaptionFromUrl(src: string | undefined | null): string {
  if (!src) return "";
  try {
    const url = new URL(src);
    const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
    const noExt = last.replace(/\.[a-z0-9]+$/i, "");
    // Skip pure UUID/hash filenames
    if (/^[0-9a-f-]{16,}$/i.test(noExt)) return "";
    const cleaned = decodeURIComponent(noExt).replace(/[-_]+/g, " ").trim();
    if (!cleaned) return "";
    return cleaned
      .split(" ")
      .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
  } catch {
    return "";
  }
}
