/**
 * stickerSuggest — derive illustrated-sticker suggestions from a typed emoji
 * at the end of a chat composer. Telegram-style auto-suggestion.
 *
 * Used by PersonalChat and GroupChat composers.
 */
import { ILLUSTRATED_PACKS, type IllustratedSticker } from "@/config/illustratedStickers";

const EMOJI_STICKER_KEYWORDS: Record<string, string[]> = {
  "😂": ["happy", "laugh"],
  "😀": ["happy"],
  "😄": ["happy"],
  "😊": ["happy", "shy"],
  "🙂": ["happy"],
  "😍": ["love"],
  "🥰": ["love"],
  "❤️": ["love"],
  "❤": ["love"],
  "💕": ["love"],
  "💖": ["love"],
  "😢": ["cry", "sad"],
  "😭": ["cry"],
  "🥲": ["cry"],
  "😠": ["angry", "grumpy"],
  "😡": ["angry"],
  "🤬": ["angry"],
  "😴": ["sleepy"],
  "🥱": ["sleepy"],
  "😮": ["surprised"],
  "😲": ["surprised"],
  "😯": ["surprised"],
  "😎": ["cool"],
  "😳": ["shy"],
};

const ALL_STICKERS_FLAT = ILLUSTRATED_PACKS.flatMap((p) => p.stickers);

/**
 * Find the trailing emoji (if any) at the end of the input. Handles common
 * multi-codepoint emoji (e.g. ❤️ which is U+2764 + U+FE0F variant selector,
 * or 😂 which is a UTF-16 surrogate pair).
 */
export function trailingEmoji(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trimEnd();
  if (!trimmed) return null;
  const last2 = trimmed.slice(-2);
  if (EMOJI_STICKER_KEYWORDS[last2]) return last2;
  const last1 = trimmed.slice(-1);
  if (EMOJI_STICKER_KEYWORDS[last1]) return last1;
  return null;
}

/**
 * Return up to `max` illustrated stickers whose alt-text matches the keywords
 * associated with the trailing emoji of `text`. Empty array if no match.
 */
export function suggestStickersFor(text: string, max = 6): IllustratedSticker[] {
  const emoji = trailingEmoji(text);
  if (!emoji) return [];
  const keywords = EMOJI_STICKER_KEYWORDS[emoji];
  if (!keywords?.length) return [];
  const lower = keywords.map((k) => k.toLowerCase());
  return ALL_STICKERS_FLAT
    .filter((s) => lower.some((k) => s.alt.toLowerCase().includes(k)))
    .slice(0, max);
}
