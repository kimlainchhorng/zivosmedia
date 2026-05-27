/**
 * useImagePreload Hook
 * Injects preload link for critical images (hero, above-fold)
 * Improves LCP by prioritizing image fetching
 */

import { useEffect } from "react";

interface PreloadOptions {
  /** Image source URL */
  src: string;
  /** Whether to preload (default: true) */
  enabled?: boolean;
  /** Responsive srcset for preload */
  srcSet?: string;
  /** Sizes attribute for responsive preload */
  sizes?: string;
  /** Image type hint */
  type?: "image/webp" | "image/jpeg" | "image/png" | "image/avif";
}

/**
 * Preloads an image by injecting a <link rel="preload"> into the document head.
 * Cleans up the preload link on unmount.
 * 
 * @example
 * useImagePreload({ src: heroImage, enabled: true });
 */
export function useImagePreload({
  src,
  enabled = true,
  srcSet,
  sizes,
  type,
}: PreloadOptions): void {
  useEffect(() => {
    if (!enabled || !src) return;

    // Check if preload link already exists for this image
    const existingPreload = document.querySelector(
      `link[rel="preload"][href="${src}"]`
    );
    if (existingPreload) return;

    // Create preload link
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = src;

    // Add responsive attributes if provided
    if (srcSet) {
      link.setAttribute("imagesrcset", srcSet);
    }
    if (sizes) {
      link.setAttribute("imagesizes", sizes);
    }
    if (type) {
      link.type = type;
    }

    // Set high fetchpriority for LCP optimization
    link.setAttribute("fetchpriority", "high");

    // Append to head
    document.head.appendChild(link);

    // Cleanup on unmount
    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, [src, enabled, srcSet, sizes, type]);
}

/**
 * Generates responsive srcset for Unsplash images
 * Includes WebP format and optimized quality
 */
export function generateUnsplashSrcSet(
  baseUrl: string,
  widths: number[] = [320, 640, 1024, 1440, 1920]
): string {
  // Extract base URL without query params
  const url = new URL(baseUrl);
  const baseWithoutParams = `${url.origin}${url.pathname}`;
  
  return widths
    .map((w) => `${baseWithoutParams}?w=${w}&q=75&fm=webp&auto=format ${w}w`)
    .join(", ");
}

/**
 * Generates optimized Unsplash URL with WebP and reduced quality
 */
export function optimizeUnsplashUrl(
  url: string,
  options: { width?: number; height?: number; quality?: number } = {}
): string {
  const { width, height, quality = 75 } = options;
  
  try {
    const parsedUrl = new URL(url);
    
    // Set optimization params
    parsedUrl.searchParams.set("q", quality.toString());
    parsedUrl.searchParams.set("fm", "webp");
    parsedUrl.searchParams.set("auto", "format");
    
    if (width) parsedUrl.searchParams.set("w", width.toString());
    if (height) parsedUrl.searchParams.set("h", height.toString());
    
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export default useImagePreload;
