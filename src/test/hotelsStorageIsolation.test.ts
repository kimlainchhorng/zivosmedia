import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/lodging/HotelsLandingPage.tsx"), "utf8");
const detailSource = readFileSync(resolve(process.cwd(), "src/pages/lodging/HotelResortDetailPage.tsx"), "utf8");

describe("hotel discovery personal storage isolation", () => {
  it("scopes recent searches, favorites, and recently viewed hotels to the account", () => {
    expect(source).toContain('import { useAuth } from "@/contexts/AuthContext";');
    expect(source).toContain('const HOTEL_RECENT_SEARCHES_KEY = "zivo:hotels:recent-searches";');
    expect(source).toContain('const HOTEL_FAVORITES_KEY = "zivo:hotels:favorites";');
    expect(source).toContain('const HOTEL_RECENTLY_VIEWED_KEY = "zivo:hotels:recently-viewed";');
    expect(source).toMatch(/hotelStorageKey = \(baseKey: string, userId: string \| null\)/);
    expect(source).toMatch(/userId \? `\$\{baseKey\}:\$\{userId\}` : null/);
    expect(source).toMatch(/readHotelStringList\(HOTEL_RECENT_SEARCHES_KEY, userId, 5\)/);
    expect(source).toMatch(/readHotelStringList\(HOTEL_FAVORITES_KEY, userId, 100\)/);
    expect(source).toMatch(/readHotelRecentlyViewed\(userId\)/);
    expect(source).not.toContain('"hotel_recent_searches"');
    expect(source).not.toContain('"hotel_faves"');
    expect(source).not.toContain('"hotel_recently_viewed"');
    expect(detailSource).toContain('import { useAuth } from "@/contexts/AuthContext";');
    expect(detailSource).toContain('const HOTEL_FAVORITES_KEY = "zivo:hotels:favorites";');
    expect(detailSource).toContain('const HOTEL_RECENTLY_VIEWED_KEY = "zivo:hotels:recently-viewed";');
    expect(detailSource).toMatch(/hotelStorageKey = \(baseKey: string, userId: string \| null\)/);
    expect(detailSource).toMatch(/const \{ user \} = useAuth\(\);/);
    expect(detailSource).not.toContain('"hotel_faves"');
    expect(detailSource).not.toContain('"hotel_recently_viewed"');
  });

  it("validates local shapes and refuses signed-out persistence", () => {
    expect(source).toMatch(/if \(!key \|\| typeof window === "undefined"\) return \[\]/);
    expect(source).toMatch(/if \(typeof value !== "string"\) return items/);
    expect(source).toMatch(/const isRecentlyViewed = \(value: unknown\): value is RecentlyViewed/);
    expect(source).toMatch(/if \(v\.length < 3 \|\| !userId\) return/);
    expect(source).toMatch(/if \(!userId\) return;/);
    expect(source).toMatch(/const favoriteIds = favoriteState\.userId === userId/);
    expect(source).toMatch(/const recentlyViewed = recentlyViewedState\.userId === userId/);
    expect(detailSource).toMatch(/const favoriteIds = favoriteState\.userId === userId/);
    expect(detailSource).toMatch(/if \(!userId \|\| !storeId\) return;/);
    expect(detailSource).toMatch(/if \(!storeId \|\| !store\?\.name \|\| !key\) return;/);
  });
});
