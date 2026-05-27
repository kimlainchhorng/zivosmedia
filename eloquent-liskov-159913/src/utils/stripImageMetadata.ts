/**
 * Strip EXIF / GPS / camera metadata from user-uploaded images by re-encoding
 * them through a canvas. The canvas pipeline drops every metadata block
 * (Exif, GPS, IPTC, XMP, ICC profiles, MakerNote, etc.) — what comes out
 * has only the pixel data plus a clean MIME container.
 *
 * Why: phone photos contain GPS coordinates and camera serial numbers by
 * default. Posting one to a public profile leaks the user's home address.
 * This is a privacy + safety control, not just a security one.
 *
 * Returns the original file untouched for non-image types (video, PDF,
 * documents) — those need different pipelines.
 */

const STRIPPABLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DEFAULT_QUALITY = 0.92;
const DEFAULT_MAX_DIM = 4096;

export interface StripOptions {
  quality?: number;
  maxDimension?: number;
}

export async function stripImageMetadata(
  file: File,
  opts: StripOptions = {},
): Promise<File> {
  if (!STRIPPABLE_TYPES.has(file.type)) return file;

  const quality = opts.quality ?? DEFAULT_QUALITY;
  const maxDim = opts.maxDimension ?? DEFAULT_MAX_DIM;

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
    } else {
      const img = new Image();
      const url = URL.createObjectURL(file);
      try {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("decode-failed"));
          img.src = url;
        });
      } finally {
        URL.revokeObjectURL(url);
      }
      bitmap = img;
    }
  } catch {
    return file;
  }

  const srcW = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
  const srcH = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
  if (!srcW || !srcH) return file;

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h);
  if ("close" in bitmap && typeof (bitmap as ImageBitmap).close === "function") {
    (bitmap as ImageBitmap).close();
  }

  const outType = file.type === "image/png" ? "image/png" : file.type;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outType, outType === "image/png" ? undefined : quality),
  );
  if (!blob) return file;

  return new File([blob], file.name, { type: outType, lastModified: Date.now() });
}

/**
 * Convenience wrapper for arrays of files.
 */
export async function stripImageMetadataAll(files: File[], opts?: StripOptions): Promise<File[]> {
  return Promise.all(files.map((f) => stripImageMetadata(f, opts)));
}
