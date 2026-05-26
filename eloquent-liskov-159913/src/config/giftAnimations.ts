/**
 * Gift animation video mapping — LAZY LOADED
 * Videos are fetched from CDN; this module only resolves URLs on first access.
 * Maps gift names to their full-screen animation videos.
 */

// Gift names that have video animations (lightweight sync check)
export const giftsWithVideo = new Set([
  "Fire Dragon",
  "Sapphire Swan", "Royal Crown", "Gold Fountain",
  "Emerald Eagle", "Diamond Rain", "Crystal Pegasus",
  "Platinum Panda", "Luxury Lambo", "Treasure Dragon",
  "Neon Rocket", "Gold Ferrari", "Gold Helicopter", "Rolls Royce",
  "Black Panther", "Bugatti", "Diamond Dragon", "Luxury Yacht",
  "Private Island", "Cosmic Dragon", "Galaxy Crown",
  "Golden Castle", "Diamond Throne", "Celestial Phoenix",
]);

/** Check if a gift has a video animation (sync, zero-cost) */
export function hasGiftVideo(name: string): boolean {
  return giftsWithVideo.has(name);
}

// Cached map — populated on first getGiftVideoUrl() call
let videoMapPromise: Promise<Record<string, string>> | null = null;
let videoMapCache: Record<string, string> | null = null;

async function loadVideoMap(): Promise<Record<string, string>> {
  const [
    fireDragonVid, sapphireSwanVid, royalCrownVid, goldFountainVid,
    emeraldEagleVid, diamondRainVid, crystalPegasusVid, platinumPandaVid,
    luxuryLamboVid, treasureDragonVid, neonRocketVid, goldFerrariVid,
    goldHelicopterVid, rollsRoyceVid, blackPantherVid, bugattiVid,
    diamondDragonVid, luxuryYachtVid, privateIslandVid, cosmicDragonVid,
    galaxyCrownVid, goldenCastleVid, diamondThroneVid, celestialPhoenixVid,
  ] = await Promise.all([
    import("@/assets/gifts/animations/fire-dragon.mp4.asset.json"),
    import("@/assets/gifts/animations/sapphire-swan.mp4.asset.json"),
    import("@/assets/gifts/animations/royal-crown.mp4.asset.json"),
    import("@/assets/gifts/animations/gold-fountain.mp4.asset.json"),
    import("@/assets/gifts/animations/emerald-eagle.mp4.asset.json"),
    import("@/assets/gifts/animations/diamond-rain.mp4.asset.json"),
    import("@/assets/gifts/animations/crystal-pegasus.mp4.asset.json"),
    import("@/assets/gifts/animations/platinum-panda.mp4.asset.json"),
    import("@/assets/gifts/animations/luxury-lambo.mp4.asset.json"),
    import("@/assets/gifts/animations/treasure-dragon.mp4.asset.json"),
    import("@/assets/gifts/animations/neon-rocket.mp4.asset.json"),
    import("@/assets/gifts/animations/gold-ferrari.mp4.asset.json"),
    import("@/assets/gifts/animations/gold-helicopter.mp4.asset.json"),
    import("@/assets/gifts/animations/rolls-royce.mp4.asset.json"),
    import("@/assets/gifts/animations/black-panther.mp4.asset.json"),
    import("@/assets/gifts/animations/bugatti.mp4.asset.json"),
    import("@/assets/gifts/animations/diamond-dragon.mp4.asset.json"),
    import("@/assets/gifts/animations/luxury-yacht.mp4.asset.json"),
    import("@/assets/gifts/animations/private-island.mp4.asset.json"),
    import("@/assets/gifts/animations/cosmic-dragon.mp4.asset.json"),
    import("@/assets/gifts/animations/galaxy-crown.mp4.asset.json"),
    import("@/assets/gifts/animations/golden-castle.mp4.asset.json"),
    import("@/assets/gifts/animations/diamond-throne.mp4.asset.json"),
    import("@/assets/gifts/animations/celestial-phoenix.mp4.asset.json"),
  ]);

  return {
    "Fire Dragon": fireDragonVid.default?.url ?? fireDragonVid.url,
    "Sapphire Swan": sapphireSwanVid.default?.url ?? sapphireSwanVid.url,
    "Royal Crown": royalCrownVid.default?.url ?? royalCrownVid.url,
    "Gold Fountain": goldFountainVid.default?.url ?? goldFountainVid.url,
    "Emerald Eagle": emeraldEagleVid.default?.url ?? emeraldEagleVid.url,
    "Diamond Rain": diamondRainVid.default?.url ?? diamondRainVid.url,
    "Crystal Pegasus": crystalPegasusVid.default?.url ?? crystalPegasusVid.url,
    "Platinum Panda": platinumPandaVid.default?.url ?? platinumPandaVid.url,
    "Luxury Lambo": luxuryLamboVid.default?.url ?? luxuryLamboVid.url,
    "Treasure Dragon": treasureDragonVid.default?.url ?? treasureDragonVid.url,
    "Neon Rocket": neonRocketVid.default?.url ?? neonRocketVid.url,
    "Gold Ferrari": goldFerrariVid.default?.url ?? goldFerrariVid.url,
    "Gold Helicopter": goldHelicopterVid.default?.url ?? goldHelicopterVid.url,
    "Rolls Royce": rollsRoyceVid.default?.url ?? rollsRoyceVid.url,
    "Black Panther": blackPantherVid.default?.url ?? blackPantherVid.url,
    "Bugatti": bugattiVid.default?.url ?? bugattiVid.url,
    "Diamond Dragon": diamondDragonVid.default?.url ?? diamondDragonVid.url,
    "Luxury Yacht": luxuryYachtVid.default?.url ?? luxuryYachtVid.url,
    "Private Island": privateIslandVid.default?.url ?? privateIslandVid.url,
    "Cosmic Dragon": cosmicDragonVid.default?.url ?? cosmicDragonVid.url,
    "Galaxy Crown": galaxyCrownVid.default?.url ?? galaxyCrownVid.url,
    "Golden Castle": goldenCastleVid.default?.url ?? goldenCastleVid.url,
    "Diamond Throne": diamondThroneVid.default?.url ?? diamondThroneVid.url,
    "Celestial Phoenix": celestialPhoenixVid.default?.url ?? celestialPhoenixVid.url,
  };
}

/** Get the video URL for a gift (async, lazy-loads on first call, cached after) */
export async function getGiftVideoUrl(name: string): Promise<string | undefined> {
  if (videoMapCache) return videoMapCache[name];
  if (!videoMapPromise) {
    videoMapPromise = loadVideoMap().then(map => { videoMapCache = map; return map; });
  }
  const map = await videoMapPromise;
  return map[name];
}

// Legacy compat — keep the old export name but as a getter that returns cached map or empty
// This allows existing sync checks like `giftAnimationVideos[name]` to work after preload
export const giftAnimationVideos: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return videoMapCache?.[prop];
  },
  has(_target, prop: string) {
    return giftsWithVideo.has(prop);
  },
});

/** Preload the video map (call when entering live stream) */
export function preloadGiftAnimations(): void {
  if (!videoMapPromise) {
    videoMapPromise = loadVideoMap().then(map => { videoMapCache = map; return map; });
  }
}
