/**
 * AdSense ad-unit slot IDs.
 *
 * HOW TO TURN ON ADS (2 steps):
 *  1. Set VITE_GOOGLE_ADSENSE_CLIENT to your publisher id:
 *       ca-pub-XXXXXXXXXXXXXXXX
 *  2. In AdSense -> Ads -> "By ad unit" -> create a "Display" unit for each spot
 *     below, then set the matching VITE_ADSENSE_SLOT_* env var to its slot
 *     number (the data-ad-slot="..." value).
 *
 * Leave a value as "" to keep that spot empty (renders nothing — safe).
 * Ads only ever show on the LIVE site after a visitor accepts marketing cookies;
 * they never show on localhost (Google blocks that on purpose).
 */
function envSlot(value: string | undefined): string {
  const slot = value?.trim() ?? "";
  return /^\d{5,}$/.test(slot) ? slot : "";
}

export const AD_SLOTS = {
  /** ZIVO home feed — between content sections. */
  homeFeed: envSlot(import.meta.env.VITE_ADSENSE_SLOT_HOME_FEED),
  /** Flight / hotel / car search results — between result groups. */
  searchResults: envSlot(import.meta.env.VITE_ADSENSE_SLOT_SEARCH_RESULTS),
  /** Inside long content / article pages. */
  articleInline: envSlot(import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_INLINE),
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;
