const MB = 1024 * 1024;

export const INLINE_IMAGE_FALLBACK_LIMIT_BYTES = 10 * MB;
export const INLINE_VIDEO_FALLBACK_LIMIT_BYTES = 8 * MB;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare image"));
    img.src = src;
  });
}

async function compressImageDataUrl(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);
  if (file.type === "image/gif") return original;

  try {
    const img = await loadImage(original);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.86);
  } catch {
    return original;
  }
}

export async function fileToInlineChatMediaUrl(file: File, kind: "image" | "video"): Promise<string> {
  const limit = kind === "image" ? INLINE_IMAGE_FALLBACK_LIMIT_BYTES : INLINE_VIDEO_FALLBACK_LIMIT_BYTES;
  if (file.size > limit) {
    throw new Error(`${kind === "image" ? "Image" : "Video"} is too large for inline fallback`);
  }
  if (kind === "image") return compressImageDataUrl(file);
  return readFileAsDataUrl(file);
}

