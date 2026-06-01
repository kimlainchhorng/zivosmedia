/**
 * AdSense ad-unit slot IDs.
 *
 * HOW TO TURN ON ADS (2 steps):
 *  1. Put your publisher id in index.html:
 *       <meta name="zivo-adsense-client" content="ca-pub-XXXXXXXXXXXXXXXX" />
 *  2. In AdSense → Ads → "By ad unit" → create a "Display" unit for each spot
 *     below, then paste its slot number (the data-ad-slot="..." value) here.
 *
 * Leave a value as "" to keep that spot empty (renders nothing — safe).
 * Ads only ever show on the LIVE site after a visitor accepts marketing cookies;
 * they never show on localhost (Google blocks that on purpose).
 */
export const AD_SLOTS = {
  /** ZIVO home feed — between content sections. */
  homeFeed: "",
  /** Flight / hotel / car search results — between result groups. */
  searchResults: "",
  /** Inside long content / article pages. */
  articleInline: "",
} as const;

export type AdSlotName = keyof typeof AD_SLOTS;
