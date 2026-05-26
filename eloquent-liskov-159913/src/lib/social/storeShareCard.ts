/**
 * storeShareCard — generate a 1080x1080 PNG share card for a store.
 * Used by the Stores list/details share action so recipients see a
 * preview without opening the link.
 */
import { buildShopDeepLink } from "@/lib/deepLinks";

export interface StoreCardInput {
  id: string;
  name: string;
  slug: string;
  category: string;
  address: string | null;
  rating: number | null;
  logo_url: string | null;
}

export interface StoreCardOptions {
  distanceMi?: number | null;
  categoryLabel?: string;
}

const SIZE = 1080;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateStoreCard(
  store: StoreCardInput,
  opts: StoreCardOptions = {}
): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background gradient (emerald brand)
  const bg = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  bg.addColorStop(0, "#059669");
  bg.addColorStop(1, "#0f766e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle decorative circle
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.arc(SIZE - 80, 120, 260, 0, Math.PI * 2);
  ctx.fill();

  // ZIVO wordmark
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "800 44px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("ZIVO", 64, 64);
  ctx.font = "500 22px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Discover local stores", 64, 116);

  // White card
  const cardX = 64;
  const cardY = 220;
  const cardW = SIZE - 128;
  const cardH = SIZE - cardY - 64;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  roundedRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Store logo
  const logoSize = 180;
  const logoX = cardX + 56;
  const logoY = cardY + 56;
  ctx.save();
  roundedRect(ctx, logoX, logoY, logoSize, logoSize, 32);
  ctx.fillStyle = "#ecfdf5";
  ctx.fill();
  ctx.clip();
  if (store.logo_url) {
    const img = await loadImage(store.logo_url);
    if (img) ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
    else {
      ctx.fillStyle = "#10b981";
      ctx.font = "700 96px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(store.name.charAt(0).toUpperCase(), logoX + logoSize / 2, logoY + logoSize / 2);
      ctx.textAlign = "start";
    }
  } else {
    ctx.fillStyle = "#10b981";
    ctx.font = "700 96px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(store.name.charAt(0).toUpperCase(), logoX + logoSize / 2, logoY + logoSize / 2);
    ctx.textAlign = "start";
  }
  ctx.restore();

  // Name
  const textX = logoX + logoSize + 36;
  const textRight = cardX + cardW - 56;
  const textWidth = textRight - textX;

  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "top";
  ctx.font = "800 56px system-ui, -apple-system, sans-serif";
  const nameLines = wrapLine(ctx, store.name, textWidth).slice(0, 2);
  let cursorY = logoY + 8;
  nameLines.forEach((line, i) => {
    ctx.fillText(line, textX, cursorY + i * 64);
  });
  cursorY += nameLines.length * 64 + 8;

  // Category chip
  const label = (opts.categoryLabel || store.category || "").toUpperCase();
  if (label) {
    ctx.font = "700 22px system-ui, sans-serif";
    const w = ctx.measureText(label).width + 28;
    roundedRect(ctx, textX, cursorY, w, 36, 18);
    ctx.fillStyle = "#d1fae5";
    ctx.fill();
    ctx.fillStyle = "#047857";
    ctx.fillText(label, textX + 14, cursorY + 7);
    cursorY += 52;
  }

  // Rating + distance row
  ctx.font = "700 30px system-ui, sans-serif";
  let metaX = textX;
  if (store.rating != null) {
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("★", metaX, cursorY);
    metaX += 32;
    ctx.fillStyle = "#0f172a";
    ctx.fillText(store.rating.toFixed(1), metaX, cursorY);
    metaX += ctx.measureText(store.rating.toFixed(1)).width + 28;
  }
  if (opts.distanceMi != null) {
    ctx.fillStyle = "#475569";
    const d = opts.distanceMi < 0.1 ? "<0.1 mi away" : `${opts.distanceMi.toFixed(1)} mi away`;
    ctx.fillText(d, metaX, cursorY);
  }

  // Address (bottom of card)
  if (store.address) {
    ctx.fillStyle = "#475569";
    ctx.font = "500 28px system-ui, sans-serif";
    const addrY = cardY + cardH - 180;
    const addrLines = wrapLine(ctx, store.address, cardW - 112).slice(0, 2);
    addrLines.forEach((line, i) => {
      ctx.fillText(line, cardX + 56, addrY + i * 36);
    });
  }

  // Footer URL
  ctx.fillStyle = "#10b981";
  ctx.font = "700 28px system-ui, sans-serif";
  const url = `hizovo.com/s/${store.slug}`;
  ctx.fillText(url, cardX + 56, cardY + cardH - 80);

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.95)
  );
}

export interface ShareStoreResult {
  mode: "shared-with-image" | "shared-link" | "copied" | "downloaded" | "cancelled" | "error";
}

/** Best-effort: native share with image, then URL share, then clipboard, then download. */
export async function shareStoreWithCard(
  store: StoreCardInput,
  opts: StoreCardOptions = {}
): Promise<ShareStoreResult> {
  const url = buildShopDeepLink(store.slug);
  const text = `Check out ${store.name} on ZIVO`;

  let blob: Blob | null = null;
  try {
    blob = await generateStoreCard(store, opts);
  } catch {
    blob = null;
  }

  // Try native share with file
  if (blob && typeof navigator !== "undefined" && (navigator as any).canShare) {
    try {
      const file = new File([blob], `${store.slug || "store"}.png`, { type: "image/png" });
      if ((navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ title: store.name, text, url, files: [file] });
        return { mode: "shared-with-image" };
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return { mode: "cancelled" };
    }
  }

  // Fallback: URL-only native share
  if (typeof navigator !== "undefined" && (navigator as any).share) {
    try {
      await (navigator as any).share({ title: store.name, text, url });
      return { mode: "shared-link" };
    } catch (err: any) {
      if (err?.name === "AbortError") return { mode: "cancelled" };
    }
  }

  // Fallback: copy link, and download image so the user gets both
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(url);
  } catch {
    /* ignore */
  }

  if (blob) {
    try {
      const dl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dl;
      a.download = `${store.slug || "store"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(dl), 1000);
      return { mode: "downloaded" };
    } catch {
      /* ignore */
    }
  }

  return { mode: "copied" };
}
