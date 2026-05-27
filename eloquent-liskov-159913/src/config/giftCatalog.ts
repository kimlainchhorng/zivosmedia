/**
 * Shared gift catalog — sorted low → high within each tab
 * Level tiers: Lv.1 (1-9), Lv.2 (10-49), Lv.3 (50-99), Lv.4 (100-499),
 *              Lv.5 (500-999), Lv.6 (1000-4999), Lv.7 (5000-9999),
 *              Lv.8 (10000-19999), Lv.9 (20000-49999), Lv.10 (50000+)
 */

export interface GiftItem {
  icon: string;
  name: string;
  coins: number;
  badge?: string;
  bg: string;
  level: number;
}

export function getGiftLevel(coins: number): number {
  if (coins >= 50000) return 10;
  if (coins >= 20000) return 9;
  if (coins >= 10000) return 8;
  if (coins >= 5000) return 7;
  if (coins >= 1000) return 6;
  if (coins >= 500) return 5;
  if (coins >= 100) return 4;
  if (coins >= 50) return 3;
  if (coins >= 10) return 2;
  return 1;
}

export function getLevelColor(level: number): string {
  switch (level) {
    case 1: return "text-zinc-400";
    case 2: return "text-green-400";
    case 3: return "text-blue-400";
    case 4: return "text-purple-400";
    case 5: return "text-pink-400";
    case 6: return "text-amber-400";
    case 7: return "text-orange-400";
    case 8: return "text-red-400";
    case 9: return "text-rose-400";
    case 10: return "text-yellow-300";
    default: return "text-zinc-400";
  }
}

export function getLevelBg(level: number): string {
  switch (level) {
    case 1: return "bg-zinc-500/20";
    case 2: return "bg-green-500/20";
    case 3: return "bg-blue-500/20";
    case 4: return "bg-purple-500/20";
    case 5: return "bg-pink-500/20";
    case 6: return "bg-amber-500/20";
    case 7: return "bg-orange-500/20";
    case 8: return "bg-red-500/20";
    case 9: return "bg-rose-500/20";
    case 10: return "bg-yellow-500/20";
    default: return "bg-zinc-500/20";
  }
}

function withLevel(item: Omit<GiftItem, "level">): GiftItem {
  return { ...item, level: getGiftLevel(item.coins) };
}

function sortByCoins(items: Omit<GiftItem, "level">[]): GiftItem[] {
  return items.map(withLevel).sort((a, b) => a.coins - b.coins);
}

export const giftCatalog = {
  gifts: sortByCoins([
    { icon: "🐱", name: "Lucky Cat", coins: 1, bg: "from-amber-200 to-yellow-200" },
    { icon: "🐼", name: "Cute Panda", coins: 1, bg: "from-green-300 to-emerald-300" },
    { icon: "🐉", name: "Baby Dragon", coins: 1, badge: "Popular", bg: "from-orange-400 to-red-400" },
    { icon: "🐧", name: "Ice Penguin", coins: 5, bg: "from-cyan-200 to-sky-200" },
    { icon: "🐍", name: "King Cobra", coins: 5, bg: "from-purple-400 to-violet-400" },
    { icon: "🦋", name: "Rainbow Butterfly", coins: 5, bg: "from-violet-300 to-pink-300" },
    { icon: "🦊", name: "Star Fox", coins: 10, bg: "from-orange-300 to-amber-300" },
    { icon: "🦄", name: "Crystal Unicorn", coins: 10, bg: "from-pink-300 to-fuchsia-300" },
    { icon: "🐰", name: "Magic Rabbit", coins: 15, bg: "from-purple-300 to-indigo-300" },
    { icon: "🐍", name: "Snake Dance", coins: 20, bg: "from-green-400 to-lime-400" },
    { icon: "🐬", name: "Neon Dolphin", coins: 30, bg: "from-blue-400 to-cyan-400" },
    { icon: "🐺", name: "Mystic Wolf", coins: 30, bg: "from-blue-300 to-indigo-300" },
    { icon: "🐺", name: "Shadow Wolf", coins: 45, badge: "NEW", bg: "from-purple-900 to-indigo-900" },
    { icon: "🔥", name: "Phoenix Rising", coins: 50, badge: "NEW", bg: "from-orange-500 to-red-500" },
    { icon: "🔥", name: "Golden Phoenix", coins: 75, badge: "Epic", bg: "from-yellow-400 to-amber-500" },
    { icon: "", name: "Diamond Bear", coins: 99, bg: "from-sky-200 to-blue-200" },
    { icon: "🐯", name: "Thunder Tiger", coins: 199, bg: "from-amber-400 to-orange-400" },
    { icon: "🐉", name: "Fire Dragon", coins: 299, badge: "Interaction", bg: "from-red-500 to-orange-500" },
  ]),

  interactive: sortByCoins([
    { icon: "🐼", name: "Panda Party", coins: 100, badge: "NEW", bg: "from-green-300 to-teal-300" },
    { icon: "🦢", name: "Sapphire Swan", coins: 699, bg: "from-blue-200 to-sky-200" },
    { icon: "👑", name: "Royal Crown", coins: 888, bg: "from-yellow-400 to-amber-500" },
    { icon: "🪙", name: "Gold Fountain", coins: 999, bg: "from-yellow-300 to-amber-300" },
    { icon: "🦅", name: "Emerald Eagle", coins: 1200, bg: "from-green-500 to-emerald-500" },
    { icon: "", name: "Diamond Rain", coins: 1500, bg: "from-sky-300 to-blue-300" },
    { icon: "🦄", name: "Crystal Pegasus", coins: 1800, badge: "Epic", bg: "from-pink-200 to-sky-200" },
    { icon: "🐼", name: "Platinum Panda", coins: 1999, bg: "from-gray-300 to-slate-300" },
    { icon: "🏎️", name: "Luxury Lambo", coins: 2000, bg: "from-red-500 to-rose-500" },
    { icon: "🐉", name: "Treasure Dragon", coins: 2500, bg: "from-green-400 to-emerald-400" },
    { icon: "🚀", name: "Neon Rocket", coins: 2800, badge: "Epic", bg: "from-blue-500 to-purple-500" },
    { icon: "🏎️", name: "Gold Ferrari", coins: 3000, bg: "from-yellow-400 to-amber-400" },
    { icon: "🚁", name: "Gold Helicopter", coins: 3500, bg: "from-amber-400 to-yellow-400" },
    { icon: "🚗", name: "Rolls Royce", coins: 5000, badge: "Luxury", bg: "from-gray-200 to-slate-200" },
  ]),

  exclusive: sortByCoins([
    { icon: "🐆", name: "Black Panther", coins: 4999, badge: "NEW", bg: "from-purple-900 to-indigo-900" },
    { icon: "🏎️", name: "Bugatti", coins: 9999, badge: "Luxury", bg: "from-blue-500 to-cyan-500" },
    { icon: "🐉", name: "Diamond Dragon", coins: 15000, bg: "from-sky-300 to-blue-300" },
    { icon: "🛥️", name: "Luxury Yacht", coins: 19999, bg: "from-blue-400 to-indigo-400" },
    { icon: "🏝️", name: "Private Island", coins: 29999, badge: "Ultimate", bg: "from-green-400 to-teal-400" },
    { icon: "🐉", name: "Cosmic Dragon", coins: 35000, badge: "Mythic", bg: "from-violet-600 to-indigo-900" },
    { icon: "🌌", name: "Galaxy Crown", coins: 49999, badge: "Legendary", bg: "from-violet-600 to-purple-900" },
    { icon: "🏰", name: "Golden Castle", coins: 59999, badge: "Supreme", bg: "from-amber-500 to-yellow-600" },
    { icon: "💎", name: "Diamond Throne", coins: 75000, badge: "Divine", bg: "from-sky-400 to-blue-600" },
    { icon: "🔥", name: "Celestial Phoenix", coins: 99999, badge: "Immortal", bg: "from-orange-500 to-rose-600" },
  ]),
} as const satisfies Record<string, GiftItem[]>;

export type GiftTabKey = keyof typeof giftCatalog;
