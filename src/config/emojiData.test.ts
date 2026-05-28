import { describe, expect, it, beforeEach } from "vitest";
import { EMOJI_CATEGORIES, getRecentEmojis, pushRecentEmoji } from "./emojiData";

describe("EMOJI_CATEGORIES", () => {
  it("has the 10 expected categories, each non-empty", () => {
    const keys = Object.keys(EMOJI_CATEGORIES);
    expect(keys).toEqual([
      "Smileys", "Hands", "Hearts", "Animals", "Food",
      "Travel", "Sports", "Nature", "Objects", "Flags",
    ]);
    for (const list of Object.values(EMOJI_CATEGORIES)) {
      expect(list.length).toBeGreaterThan(0);
    }
  });
});

describe("recent reactions", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(getRecentEmojis()).toEqual([]);
  });

  it("stores most-recent-first", () => {
    pushRecentEmoji("😀");
    pushRecentEmoji("🔥");
    expect(getRecentEmojis()).toEqual(["🔥", "😀"]);
  });

  it("dedupes, moving a repeat to the front", () => {
    pushRecentEmoji("😀");
    pushRecentEmoji("🔥");
    pushRecentEmoji("😀");
    expect(getRecentEmojis()).toEqual(["😀", "🔥"]);
  });

  it("caps the list at 24 entries", () => {
    for (let i = 0; i < 30; i++) pushRecentEmoji(`e${i}`);
    const recents = getRecentEmojis();
    expect(recents.length).toBe(24);
    expect(recents[0]).toBe("e29");
  });

  it("ignores empty input", () => {
    pushRecentEmoji("");
    expect(getRecentEmojis()).toEqual([]);
  });
});
