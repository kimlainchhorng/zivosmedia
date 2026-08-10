import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/MorePage.tsx"), "utf8");

describe("MorePage personal local state isolation", () => {
  it("scopes searches and shortcuts to the authenticated account", () => {
    expect(source).toMatch(/type AccountStringListState = \{ userId: string \| null; items: string\[\] \}/);
    expect(source).toMatch(/accountStorageKey = \(baseKey: string, userId: string \| null\)/);
    expect(source).toMatch(/userId \? `\$\{baseKey\}:\$\{userId\}` : null/);
    expect(source).toMatch(/readAccountStoredStringList\(SEARCH_HISTORY_KEY, userId, 5\)/);
    expect(source).toMatch(/readAccountStoredStringList\(RECENT_KEY, userId, 8\)/);
    expect(source).toMatch(/readAccountStoredStringList\(PIN_KEY, userId, 12\)/);
    expect(source).toMatch(/const streakStorageKey = accountStorageKey\(STREAK_KEY, userId\)/);
    expect(source).toMatch(/if \(!streakStorageKey \|\| typeof window === "undefined"\) return/);
    expect(source).toMatch(/window\.localStorage\.getItem\(streakStorageKey\)/);
    expect(source).toMatch(/window\.localStorage\.setItem\(streakStorageKey/);
    expect(source).toMatch(/persistAccountStoredStringList\(SEARCH_HISTORY_KEY, userId, next, 5\)/);
    expect(source).toMatch(/persistAccountStoredStringList\(RECENT_KEY, userId, next, 8\)/);
    expect(source).toMatch(/persistAccountStoredStringList\(PIN_KEY, userId, next, 12\)/);
    expect(source).toMatch(/searchHistoryState\.userId === userId/);
    expect(source).toMatch(/recentState\.userId === userId/);
    expect(source).toMatch(/pinnedState\.userId === userId/);
    expect(source).not.toMatch(/persistStoredStringList\((?:SEARCH_HISTORY_KEY|RECENT_KEY|PIN_KEY)/);
  });
});
