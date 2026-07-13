/**
 * Gift icon image imports — LAZY LOADED
 * Images are only loaded when the gift panel opens on a live stream page.
 */
import goldCoin from "@/assets/gifts/gold-coin.png";
export { goldCoin };

let imageMapCache: Record<string, string> | null = null;
let imageMapPromise: Promise<Record<string, string>> | null = null;

async function loadGiftImages(): Promise<Record<string, string>> {
  const mods = await Promise.all([
    import("@/assets/gifts/baby-dragon.png"),
    import("@/assets/gifts/cute-panda.png"),
    import("@/assets/gifts/king-cobra.png"),
    import("@/assets/gifts/crystal-unicorn.png"),
    import("@/assets/gifts/phoenix-rising.png"),
    import("@/assets/gifts/diamond-bear.png"),
    import("@/assets/gifts/lucky-cat.png"),
    import("@/assets/gifts/mystic-wolf.png"),
    import("@/assets/gifts/rainbow-butterfly.png"),
    import("@/assets/gifts/thunder-tiger.png"),
    import("@/assets/gifts/star-fox.png"),
    import("@/assets/gifts/ice-penguin.png"),
    import("@/assets/gifts/magic-rabbit.png"),
    import("@/assets/gifts/neon-dolphin.png"),
    import("@/assets/gifts/snake-dance.png"),
    import("@/assets/gifts/fire-dragon.png"),
    import("@/assets/gifts/shadow-wolf.png"),
    import("@/assets/gifts/golden-phoenix.png"),
    import("@/assets/gifts/panda-party.png"),
    import("@/assets/gifts/luxury-lambo.png"),
    import("@/assets/gifts/gold-ferrari.png"),
    import("@/assets/gifts/rolls-royce.png"),
    import("@/assets/gifts/diamond-rain.png"),
    import("@/assets/gifts/gold-fountain.png"),
    import("@/assets/gifts/treasure-dragon.png"),
    import("@/assets/gifts/gold-helicopter.png"),
    import("@/assets/gifts/sapphire-swan.png"),
    import("@/assets/gifts/emerald-eagle.png"),
    import("@/assets/gifts/royal-crown.png"),
    import("@/assets/gifts/platinum-panda.png"),
    import("@/assets/gifts/crystal-pegasus.png"),
    import("@/assets/gifts/neon-rocket.png"),
    import("@/assets/gifts/black-panther.png"),
    import("@/assets/gifts/bugatti.png"),
    import("@/assets/gifts/diamond-dragon.png"),
    import("@/assets/gifts/luxury-yacht.png"),
    import("@/assets/gifts/private-island.png"),
    import("@/assets/gifts/galaxy-crown.png"),
    import("@/assets/gifts/golden-castle.png"),
    import("@/assets/gifts/cosmic-dragon.png"),
    import("@/assets/gifts/diamond-throne.png"),
    import("@/assets/gifts/celestial-phoenix.png"),
  ]);

  const names = [
    "Baby Dragon", "Cute Panda", "King Cobra", "Crystal Unicorn",
    "Phoenix Rising", "Diamond Bear", "Lucky Cat", "Mystic Wolf",
    "Rainbow Butterfly", "Thunder Tiger", "Star Fox", "Ice Penguin",
    "Magic Rabbit", "Neon Dolphin", "Snake Dance", "Fire Dragon",
    "Shadow Wolf", "Golden Phoenix",
    "Panda Party", "Luxury Lambo", "Gold Ferrari", "Rolls Royce",
    "Diamond Rain", "Gold Fountain", "Treasure Dragon", "Gold Helicopter",
    "Sapphire Swan", "Emerald Eagle", "Royal Crown", "Platinum Panda",
    "Crystal Pegasus", "Neon Rocket",
    "Black Panther", "Bugatti", "Diamond Dragon", "Luxury Yacht",
    "Private Island", "Galaxy Crown", "Golden Castle", "Cosmic Dragon",
    "Diamond Throne", "Celestial Phoenix",
  ];

  const map: Record<string, string> = {};
  mods.forEach((m, i) => { map[names[i]] = m.default; });
  return map;
}

/** Preload gift images (call when entering live stream) */
export function preloadGiftImages(): void {
  if (!imageMapPromise) {
    imageMapPromise = loadGiftImages().then(m => { imageMapCache = m; return m; });
  }
}

/** Get gift image URL (async, lazy) */
export async function getGiftImage(name: string): Promise<string | undefined> {
  if (imageMapCache) return imageMapCache[name];
  if (!imageMapPromise) preloadGiftImages();
  const map = await imageMapPromise!;
  return map[name];
}

// Proxy for legacy sync access — returns cached value or undefined
export const giftImages: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    return imageMapCache?.[prop];
  },
});
