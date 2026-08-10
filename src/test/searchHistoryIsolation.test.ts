import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sources = {
  smart: readFileSync(resolve(process.cwd(), "src/pages/SmartSearchPage.tsx"), "utf8"),
  universal: readFileSync(resolve(process.cwd(), "src/components/search/UniversalSearchOverlay.tsx"), "utf8"),
  travel: readFileSync(resolve(process.cwd(), "src/components/search/PremiumSearchOverlay.tsx"), "utf8"),
};

describe("search history account isolation and schema separation", () => {
  it("uses distinct authenticated-account keys for each search surface", () => {
    expect(sources.smart).toContain('const SMART_SEARCH_HISTORY_KEY = "zivo:smart-search:recent";');
    expect(sources.smart).toMatch(/smartSearchStorageKey = \(userId: string \| null\)/);
    expect(sources.smart).toMatch(/userId \? `\$\{SMART_SEARCH_HISTORY_KEY\}:\$\{userId\}` : null/);
    expect(sources.universal).toContain('const RECENT_KEY = "zivo:universal-search:recent";');
    expect(sources.universal).toMatch(/recentSearchStorageKey = \(userId: string \| null\)/);
    expect(sources.universal).toMatch(/userId \? `\$\{RECENT_KEY\}:\$\{userId\}` : null/);
    expect(sources.travel).toContain('const RECENT_SEARCHES_KEY = "zivo:travel-search:recent";');
    expect(sources.travel).toMatch(/travelSearchStorageKey = \(userId: string \| null\)/);
    expect(sources.travel).toMatch(/userId \? `\$\{RECENT_SEARCHES_KEY\}:\$\{userId\}` : null/);
    expect(sources.smart + sources.universal + sources.travel).not.toContain('"zivo_recent_searches"');
  });

  it("validates stored shapes and refuses signed-out persistence", () => {
    expect(sources.smart).toMatch(/if \(!key \|\| typeof window === "undefined"\) return \[\]/);
    expect(sources.smart).toMatch(/if \(!normalized \|\| seen\.has\(normalized\) \|\| items\.length >= 5\)/);
    expect(sources.smart).toMatch(/if \(!normalized \|\| !userId\) return/);
    expect(sources.universal).toMatch(/const isRecentSearch = \(value: unknown\): value is RecentSearch/);
    expect(sources.universal).toMatch(/function saveRecentSearch\(query: string, userId: string \| null\)/);
    expect(sources.universal).toMatch(/if \(!key \|\| typeof window === "undefined"\) return/);
    expect(sources.travel).toMatch(/const isRecentSearch = \(value: unknown\): value is RecentSearch/);
    expect(sources.travel).toMatch(/if \(candidate\.type !== "flights" && candidate\.type !== "hotels" && candidate\.type !== "cars"\)/);
    expect(sources.travel).toMatch(/if \(!userId\) return/);
  });
});
