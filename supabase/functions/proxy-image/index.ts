import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ALLOWED_DOMAINS = [
  "cf.bstatic.com",
  "t.bstatic.com",
  "q-xx.bstatic.com",
  "r-xx.bstatic.com",
];

const CACHE_CONTROL = "public, max-age=31536000"; // 1 year for images
const MAX_REDIRECTS = 3;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isAllowedImageUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || parsed.port) return null;
    const hostname = parsed.hostname.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readBodyLimited(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array> {
  if (!body) throw new Error("Empty image response");
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel("image_too_large");
        throw new Error("Image response too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function hasImageSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === "image/gif") {
    return bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a" ||
      bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a";
  }
  if (contentType === "image/webp") {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  // AVIF has a brand in the ISO-BMFF ftyp box; do a bounded signature check.
  if (contentType === "image/avif") {
    const header = String.fromCharCode(...bytes.slice(4, 12));
    return bytes.length >= 12 && header === "ftypavif";
  }
  return false;
}

serve(withSecurity("proxy-image", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Extract the image URL from query parameter
  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    return new Response("Missing url parameter", { status: 400, headers: corsHeaders });
  }

  if (!isAllowedImageUrl(imageUrl)) {
    return new Response("Domain not whitelisted: image source is not allowed", { status: 403, headers: corsHeaders });
  }

  try {
    let target = imageUrl;
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      if (!isAllowedImageUrl(target)) {
        return new Response("Image redirect is not allowed", { status: 502, headers: corsHeaders });
      }
      response = await fetch(target, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://www.booking.com/",
        },
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      if (!location || hop === MAX_REDIRECTS) {
        return new Response("Too many or invalid image redirects", { status: 502, headers: corsHeaders });
      }
      target = new URL(location, target).toString();
    }

    if (!response) throw new Error("Image response unavailable");

    if (!response.ok) {
      return new Response("Failed to fetch image", { status: 502, headers: corsHeaders });
    }

    const contentType = (response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (!ALLOWED_CONTENT_TYPES.has(contentType) ||
        (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES)) {
      return new Response("Unsupported or oversized image", { status: 415, headers: corsHeaders });
    }
    const bytes = await readBodyLimited(response.body);
    if (!hasImageSignature(bytes, contentType)) {
      return new Response("Image content validation failed", { status: 415, headers: corsHeaders });
    }

    // Return the image with proper headers
    return new Response(bytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": CACHE_CONTROL,
        "Access-Control-Allow-Methods": "GET",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
