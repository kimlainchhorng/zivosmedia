import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import coreTranslations from "@/i18n/translations.core";

/**
 * Every `t("…")` key the feed renders must exist in both bundled locales.
 *
 * `t()` falls back to the key string itself when a lookup misses, so a typo
 * does not throw and does not fail a build — it ships `feed.comments.emty` to
 * the screen. Nothing else in the repo catches that: the literal ratchet only
 * sees strings that never reached the catalogue, and a key-parity check is
 * satisfied by en and km being equally wrong.
 */
const FEED_PAGE = resolve(__dirname, "..", "pages", "FeedPage.tsx");

function feedKeys(): string[] {
  const source = readFileSync(FEED_PAGE, "utf8");
  return [...new Set([...source.matchAll(/\bt\(\s*"([^"]+)"/g)].map((match) => match[1]))];
}

describe("FeedPage translation keys", () => {
  const keys = feedKeys();

  it("routes a meaningful number of strings through the catalogue", () => {
    // Guards against the sweep being reverted wholesale.
    expect(keys.length).toBeGreaterThan(50);
  });

  it.each([["en"], ["km"]])("resolves every feed key in %s", (locale) => {
    const catalogue = (coreTranslations as Record<string, Record<string, string>>)[locale];
    const missing = keys.filter((key) => typeof catalogue?.[key] !== "string");
    expect(missing, `keys missing from the ${locale} catalogue`).toEqual([]);
  });

  it("does not leave a Khmer entry identical to its English one", () => {
    const en = (coreTranslations as Record<string, Record<string, string>>).en;
    const km = (coreTranslations as Record<string, Record<string, string>>).km;
    // "QA" and other proper nouns legitimately match, so only flag entries that
    // are pure Latin prose — those are untranslated placeholders.
    const untranslated = keys.filter((key) => {
      const khmer = km?.[key];
      return typeof khmer === "string" && khmer === en?.[key] && /[a-z]{4,}\s+[a-z]/i.test(khmer);
    });
    expect(untranslated, "Khmer entries that are still English prose").toEqual([]);
  });
});
