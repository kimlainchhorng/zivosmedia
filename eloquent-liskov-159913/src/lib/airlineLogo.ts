/**
 * Airline Logo Service with Fallback Chain
 * Primary: AVS CDN (free, no auth required)
 * Fallback 1: Duffel SVG
 * Fallback 2: UI Avatars
 * Fallback 3: Plane icon (via React component)
 */

// AVS CDN - Primary source (free, no auth required)
export const AVS_CDN = 'https://pics.avs.io';

// Duffel SVG CDN - Fallback
export const DUFFEL_CDN = 'https://assets.duffel.com/img/airlines/for-light-background/full-color-logo';

// Supported sizes for logos
export type AirHexSize = 32 | 64 | 100 | 200;

/**
 * Get AVS logo URL with specific size (primary - free, no auth)
 */
export function getAVSLogoUrl(iataCode: string, size: number = 64): string {
  // AVS format: https://pics.avs.io/{SIZE}/{SIZE}/{CODE}.png
  return `${AVS_CDN}/${size}/${size}/${iataCode.toUpperCase()}.png`;
}

/**
 * Get Duffel SVG logo URL (fallback)
 */
export function getDuffelLogoUrl(iataCode: string): string {
  return `${DUFFEL_CDN}/${iataCode.toUpperCase()}.svg`;
}

/**
 * Get UI Avatars fallback (before plane icon)
 */
export function getPlaceholderLogoUrl(iataCode: string): string {
  return `https://ui-avatars.com/api/?name=${iataCode.toUpperCase()}&background=0ea5e9&color=fff&size=64&bold=true`;
}

/**
 * Build ordered fallback chain for airline logo
 */
export function getLogoFallbackChain(iataCode: string, size: AirHexSize = 64): string[] {
  const code = iataCode.toUpperCase();
  return [
    getDuffelLogoUrl(code),           // Primary: Duffel SVG (best quality)
    getAVSLogoUrl(code, size),        // Fallback 1: AVS CDN
    getPlaceholderLogoUrl(code),      // Fallback 2: UI Avatars
  ];
}

/**
 * Get primary airline logo URL
 * Use AirlineLogo component for fallback handling
 */
export function getAirlineLogoUrl(iataCode: string, size: AirHexSize = 64): string {
  return getAVSLogoUrl(iataCode, size);
}

// Memoization cache for preloaded logos
const preloadCache = new Map<string, boolean>();

/**
 * Preload airline logo to cache
 */
export async function preloadAirlineLogo(iataCode: string, size: AirHexSize = 64): Promise<boolean> {
  const cacheKey = `${iataCode}-${size}`;
  
  if (preloadCache.has(cacheKey)) {
    return preloadCache.get(cacheKey)!;
  }
  
  const url = getAVSLogoUrl(iataCode, size);
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const success = response.ok;
    preloadCache.set(cacheKey, success);
    return success;
  } catch {
    preloadCache.set(cacheKey, false);
    return false;
  }
}

/**
 * Clear preload cache (for testing)
 */
export function clearLogoCache(): void {
  preloadCache.clear();
}
