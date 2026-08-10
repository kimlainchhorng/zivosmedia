import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/StoreMapPage.tsx"), "utf8");

describe("store map personal recents isolation", () => {
  it("uses account-scoped keys for recent searches and viewed stores", () => {
    expect(source).toContain('import { useAuth } from "@/contexts/AuthContext";');
    expect(source).toContain('const MAP_RECENT_STORES_KEY = "zivo:map:recent";');
    expect(source).toContain('const MAP_RECENT_SEARCHES_KEY = "zivo:map:searches";');
    expect(source).toMatch(/mapStorageKey = \(baseKey: string, userId: string \| null\)/);
    expect(source).toMatch(/userId \? `\$\{baseKey\}:\$\{userId\}` : null/);
    expect(source).toMatch(/getRecentStoreIds\(mapUserId\)/);
    expect(source).toMatch(/getRecentSearches\(mapUserId\)/);
    expect(source).toMatch(/saveRecentStore\(selectedStoreId, mapUserId\)/);
    expect(source).toMatch(/saveRecentSearch\(searchQuery\.trim\(\), mapUserId\)/);
  });

  it("validates list entries and refuses signed-out persistence", () => {
    expect(source).toMatch(/if \(!key \|\| typeof window === "undefined"\) return \[\]/);
    expect(source).toMatch(/if \(typeof value !== "string"\) return items/);
    expect(source).toMatch(/if \(!userId\) return \[\];/);
    expect(source).toMatch(/recentIdsState\.userId === mapUserId/);
    expect(source).toMatch(/recentSearchesState\.userId === mapUserId/);
    expect(source).toMatch(/if \(searchQuery\.trim\(\) && mapUserId\)/);
    expect(source).not.toMatch(/localStorage\.(?:getItem|setItem)\(MAP_RECENT_(?:STORES|SEARCHES)_KEY/);
  });
});
