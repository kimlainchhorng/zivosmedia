/**
 * Image URL optimizer for Supabase Storage and Booking.com (bstatic) CDNs.
 * Returns a smaller-resolution variant of the source URL so we don't ship
 * 1280x900 hero photos into 200px thumbnails.
 *
 * Pick `size` to roughly match the *display* width in CSS pixels; the helper
 * picks the nearest CDN preset. Unknown hosts are returned unchanged.
 */

const SUPABASE_OBJECT = "/storage/v1/object/public/";
const SUPABASE_RENDER = "/storage/v1/render/image/public/";

// Booking.com CDN presets that actually exist on cf.bstatic.com:
//   square60, square90, square120, square180, square240,
//   max300, max500, max750, max1024x768, max1280x900, max1920
const BOOKING_PRESETS_MAX = [300, 500, 750, 1024, 1280, 1920];
const BOOKING_PRESETS_SQUARE = [60, 90, 120, 180, 240];

function pickBookingMaxPreset(width: number): number {
  for (const p of BOOKING_PRESETS_MAX) if (p >= width) return p;
  return BOOKING_PRESETS_MAX[BOOKING_PRESETS_MAX.length - 1];
}

function pickBookingSquarePreset(width: number): number {
  for (const p of BOOKING_PRESETS_SQUARE) if (p >= width) return p;
  return BOOKING_PRESETS_SQUARE[BOOKING_PRESETS_SQUARE.length - 1];
}

function bookingMaxPath(preset: number): string {
  if (preset === 1024) return "/max1024x768/";
  if (preset === 1280) return "/max1280x900/";
  return `/max${preset}/`;
}

function resolveImageUrl(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === "string") {
    const trimmed = input.trim();
    return trimmed || undefined;
  }
  if (Array.isArray(input)) {
    for (const item of input) {
      const url = resolveImageUrl(item);
      if (url) return url;
    }
    return undefined;
  }
  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    return (
      resolveImageUrl(record.url) ||
      resolveImageUrl(record.src) ||
      resolveImageUrl(record.path) ||
      resolveImageUrl(record.publicUrl) ||
      resolveImageUrl(record.public_url) ||
      resolveImageUrl(record.imageUrl) ||
      resolveImageUrl(record.image_url) ||
      resolveImageUrl(record.photo_url) ||
      resolveImageUrl(record.thumbnail_url)
    );
  }
  return undefined;
}

/**
 * @param url   Source URL (may be null/undefined — returns undefined)
 * @param size  Desired display width in CSS px (DPR is accounted for internally)
 * @param mode  "cover" rectangular preset (default) or "square" thumbnail
 */
export function optimizeImage(
  url: unknown,
  size: number = 400,
  mode: "cover" | "square" = "cover",
): string | undefined {
  const sourceUrl = resolveImageUrl(url);
  if (!sourceUrl) return undefined;

  // Account for device pixel ratio so retina screens still look sharp,
  // but cap at 2x — 3x rarely buys perceptible quality and doubles bytes.
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const targetPx = Math.round(size * dpr);

  // ── Booking.com / bstatic CDN ─────────────────────────────────────────────
  if (sourceUrl.includes("bstatic.com")) {
    if (mode === "square") {
      const preset = pickBookingSquarePreset(targetPx);
      return sourceUrl
        .replace(/\/square\d+\//, `/square${preset}/`)
        .replace(/\/max\d+(x\d+)?\//, `/square${preset}/`)
        .replace(/\/crop\/\d+x\d+\//, `/square${preset}/`);
    }
    const preset = pickBookingMaxPreset(targetPx);
    // Booking's supported max presets are not a pure aspect-ratio formula.
    const replacement = bookingMaxPath(preset);
    return sourceUrl
      .replace(/\/max\d+(x\d+)?\//, replacement)
      .replace(/\/square\d+\//, replacement)
      .replace(/\/crop\/\d+x\d+\//, replacement);
  }

  // ── Supabase Storage public URL ──────────────────────────────────────────
  if (sourceUrl.includes(SUPABASE_OBJECT)) {
    const transformed = sourceUrl.replace(SUPABASE_OBJECT, SUPABASE_RENDER);
    const sep = transformed.includes("?") ? "&" : "?";
    const params =
      mode === "square"
        ? `width=${targetPx}&height=${targetPx}&resize=cover&quality=70`
        : `width=${targetPx}&quality=70`;
    return `${transformed}${sep}${params}`;
  }

  // Unknown host — return as-is. The browser will load the original.
  return sourceUrl;
}
