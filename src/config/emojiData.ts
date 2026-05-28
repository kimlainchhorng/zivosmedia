/**
 * emojiData — shared categorized emoji dataset + recently-used reactions store.
 *
 * EMOJI_CATEGORIES is consumed by both the sticker keyboard and the message
 * reaction picker. Recents are persisted in localStorage so a user's custom
 * reactions surface first next time.
 */

export const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Smileys": [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
    "😋","😎","😍","🥰","😘","😗","😙","😚","🙂","🤗",
    "🤔","🫤","😐","😑","😶","🙄","😏","😣","😥","😮",
    "🤐","😯","😪","😫","🥱","😴","🤤","😛","😜","😝",
    "🤑","🤠","😈","👿","👻","💀","☠️","👽","🤖","🎃",
  ],
  "Hands": [
    "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌",
    "🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉",
    "👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛",
    "🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅",
    "🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","👀",
  ],
  "Hearts": [
    "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
    "❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝",
    "💟","♥️","🫀","💑","💏","👩‍❤️‍👨","👨‍❤️‍👨","👩‍❤️‍👩","🥰","😍",
  ],
  "Animals": [
    "🐱","🐶","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯",
    "🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦉","🦄",
    "🐝","🦋","🐢","🐬","🐳","🐙","🦀","🐠","🐡","🦈",
    "🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🐪","🦒",
  ],
  "Food": [
    "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈",
    "🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🍕","🍔",
    "🍟","🌭","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲",
    "🥗","🍿","🧈","🧀","🍰","🎂","🧁","🍩","🍪","🍫",
  ],
  "Travel": [
    "🚗","🚕","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻",
    "🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛺","✈️","🛫",
    "🛬","🚀","🛸","🚁","⛵","🚢","🗺️","🧭","⛺","🏖️",
    "🏔️","🗻","🌋","🗼","🏰","🗽","⛩️","🕌","🛕","⛪",
  ],
  "Sports": [
    "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱",
    "🏓","🏸","🏒","🥍","🏑","🥊","🥋","🎿","⛷️","🏂",
    "🏋️","🤸","🤼","🤺","🤾","🏌️","🏇","🧘","🏄","🏊",
    "🤽","🚣","🧗","🚴","🏆","🥇","🥈","🥉","🏅","🎖️",
  ],
  "Nature": [
    "🌸","💐","🌷","🌹","🥀","🌺","🌻","🌼","🌱","🪴",
    "🌲","🌳","🌴","🌵","🎋","🎍","🍀","☘️","🍁","🍂",
    "🍃","🌾","🌿","🪻","🪷","🍄","🐚","🪸","🪨","🌊",
    "💧","💦","☀️","🌤️","⛅","🌈","⭐","🌟","✨","🔥",
  ],
  "Objects": [
    "📱","💻","⌨️","🖥️","🖨️","🖱️","💿","📷","📸","📹",
    "🎥","🎞️","📞","☎️","📺","📻","🎙️","🎚️","🎛️","⏰",
    "⌚","🔋","🔌","💡","🔦","🕯️","🪔","💰","💳","💎",
    "🔑","🗝️","🔒","🔓","📦","📫","📬","🏷️","🔖","📎",
  ],
  "Flags": [
    "🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
    "🇺🇸","🇬🇧","🇫🇷","🇩🇪","🇯🇵","🇰🇷","🇨🇳","🇮🇳",
    "🇧🇷","🇲🇽","🇨🇦","🇦🇺","🇮🇹","🇪🇸","🇷🇺","🇹🇭",
    "🇻🇳","🇵🇭","🇮🇩","🇸🇬","🇲🇾","🇰🇭","🇦🇪","🇸🇦",
  ],
};

const RECENT_REACTIONS_KEY = "zivo_recent_reactions";
const RECENT_LIMIT = 24;

/** Most-recently-used reaction emojis, most-recent first. */
export function getRecentEmojis(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_REACTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

/** Record an emoji as recently used (dedupe, most-recent first, capped). */
export function pushRecentEmoji(emoji: string): void {
  if (!emoji) return;
  try {
    const next = [emoji, ...getRecentEmojis().filter((e) => e !== emoji)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_REACTIONS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode / SSR) — recents are best-effort.
  }
}
