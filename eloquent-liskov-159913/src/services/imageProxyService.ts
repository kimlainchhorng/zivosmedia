/**
 * Image Proxy Service
 * Proxies images from external sources (like Booking.com) through our backend
 * to bypass CORS/ORB restrictions.
 * 
 * Development: Uses imgproxy-compatible service for testing
 * Production: Can use Supabase Edge Functions or dedicated image proxy
 */

// Use images.weserv.nl - a public, reliable image proxy that handles CORS properly
// Alternative services: cloudimage.io, imgproxy.net, or a custom Supabase Edge Function
const IMAGE_PROXY_URL =
  import.meta.env.VITE_IMAGE_PROXY_URL || "https://images.weserv.nl";

/**
 * Convert a Booking.com CDN image URL to a proxied URL
 * Uses local dev server proxy or cloud proxy depending on environment
 * @example
 * proxyImageUrl("https://cf.bstatic.com/.../image.jpg")
 * → "/api/proxy-image?url=https://cf.bstatic.com/.../image.jpg"
 */
export function proxyImageUrl(originalUrl: string | null | undefined): string | null {
  if (!originalUrl) return null;

  // If it's already a relative URL or data URL, return as-is
  if (
    originalUrl.startsWith("/") ||
    originalUrl.startsWith("data:") ||
    originalUrl.startsWith("blob:")
  ) {
    return originalUrl;
  }

  // If already proxied, return as-is
  if (originalUrl.includes("/api/proxy-image")) {
    return originalUrl;
  }

  // Use local dev server proxy endpoint
  // For production, deploy the Supabase Edge Function or use a dedicated proxy service
  try {
    return `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  } catch {
    return originalUrl; // Fallback to original if encoding fails
  }
}

/**
 * Batch convert multiple image URLs to proxied URLs
 */
export function proxyImageUrls(
  urls: (string | null | undefined)[]
): (string | null)[] {
  return urls.map((url) => proxyImageUrl(url));
}

/**
 * Extract URL from image object (handles both string and object formats)
 */
export function extractImageUrl(
  item: string | { url?: string; src?: string; path?: string } | null | undefined
): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    return item.url || item.src || item.path || null;
  }
  return null;
}

/**
 * Convert array of image items (strings or objects) to proxied URLs
 */
export function proxyGalleryImages(
  items: any[] | null | undefined
): string[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => extractImageUrl(item))
    .filter((url): url is string => !!url)
    .map((url) => proxyImageUrl(url))
    .filter((url): url is string => !!url);
}
