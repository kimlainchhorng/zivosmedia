/**
 * StickerKeyboard — Version 2026 rich media panel
 * Tabs: Stickers, GIFs, Avatar, Music, Store, Memes, Future
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Smile from "lucide-react/dist/esm/icons/smile";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import UserRound from "lucide-react/dist/esm/icons/user-round";
import Music2 from "lucide-react/dist/esm/icons/music-2";
import Store from "lucide-react/dist/esm/icons/store";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Play from "lucide-react/dist/esm/icons/play";
import Pause from "lucide-react/dist/esm/icons/pause";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Shuffle from "lucide-react/dist/esm/icons/shuffle";
import Heart from "lucide-react/dist/esm/icons/heart";
import Download from "lucide-react/dist/esm/icons/download";
import Check from "lucide-react/dist/esm/icons/check";
import Rocket from "lucide-react/dist/esm/icons/rocket";
import Send from "lucide-react/dist/esm/icons/send";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import Clock from "lucide-react/dist/esm/icons/clock";
import Mic from "lucide-react/dist/esm/icons/mic";
import Camera from "lucide-react/dist/esm/icons/camera";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import X from "lucide-react/dist/esm/icons/x";
import { supabase } from "@/integrations/supabase/client";
import { ILLUSTRATED_PACKS, type IllustratedStickerPack } from "@/config/illustratedStickers";
import { getAnimatedStickerUrl } from "@/config/animatedStickerMap";
import { TransparentStickerVideo } from "./TransparentStickerVideo";
import { getStickerMotionSpec } from "./stickerMotion";
import { useSupabaseStickerPacks, useSupabaseStickers, useUserInstalledPacks, useToggleStickerPack } from "@/hooks/useSupabaseStickerPacks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ═══════════════ Types ═══════════════ */

interface StickerKeyboardProps {
  open: boolean;
  onClose: () => void;
  onSendSticker: (payload: StickerSendPayload) => void;
  onQuickAction?: (actionId: string) => void;
  onStartVoice?: () => void;
  onOpenCamera?: () => void;
}

export interface StickerSendPayload {
  text: string;
  messageType?: "sticker" | "gif" | "text";
}

interface StickerPack {
  id: string;
  name: string;
  emoji_prefix: string;
  stickers: string[];
}

interface StickerPackRow {
  id: string;
  name: string;
  emoji_prefix: string | null;
  stickers: unknown;
}

function parseStickerList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

type TabKey = "stickers" | "gifs" | "avatar" | "music" | "store" | "memes" | "future";

/* ═══════════════ Storage Keys ═══════════════ */

const RECENT_KEY = "zivo_recent_stickers";
const LAST_TAB_KEY = "zivo_last_sticker_tab";
const STORE_INSTALLED_KEY = "zivo_store_installed_packs";
const FAV_TRACKS_KEY = "zivo_favorite_tracks";
const RECENT_TRACKS_KEY = "zivo_recent_tracks";

/* ═══════════════ Sticker Data — 10 packs ═══════════════ */

const BUILTIN_STICKERS: Record<string, string[]> = {
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

/* ═══════════════ GIF Data ═══════════════ */

const GIF_CATEGORIES = ["Trending", "Reactions", "Love", "Dance", "Funny", "Celebrate"] as const;
type GifCategory = typeof GIF_CATEGORIES[number];

interface GifItem {
  id: string;
  label: string;
  url: string;
  category: GifCategory;
  altText: string;
}

const GIF_ITEMS: GifItem[] = [
  { id: "g1", label: "Thumbs Up", url: "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/200w.gif", category: "Reactions", altText: "thumbs up" },
  { id: "g2", label: "Happy Dance", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif", category: "Dance", altText: "happy dance" },
  { id: "g3", label: "Love", url: "https://media.giphy.com/media/26BRv0ThflsHCqDrG/200w.gif", category: "Love", altText: "love hearts" },
  { id: "g4", label: "LOL", url: "https://media.giphy.com/media/10JhviFuU2gWD6/200w.gif", category: "Funny", altText: "laughing" },
  { id: "g5", label: "Mind Blown", url: "https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/200w.gif", category: "Reactions", altText: "mind blown" },
  { id: "g6", label: "Celebrate", url: "https://media.giphy.com/media/g9582DNuQppxC/200w.gif", category: "Celebrate", altText: "celebration" },
  { id: "g7", label: "Wow", url: "https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/200w.gif", category: "Reactions", altText: "wow" },
  { id: "g8", label: "Party", url: "https://media.giphy.com/media/l0MYJnJQ4EiYLxvQ4/200w.gif", category: "Celebrate", altText: "party" },
  { id: "g9", label: "Clapping", url: "https://media.giphy.com/media/NEvPzZ8bd1V4Y/200w.gif", category: "Reactions", altText: "clapping" },
  { id: "g10", label: "Hug", url: "https://media.giphy.com/media/XpgOZHuDfIkoM/200w.gif", category: "Love", altText: "hug" },
  { id: "g11", label: "Groovy", url: "https://media.giphy.com/media/l3q2Hy66w1hpDSWUE/200w.gif", category: "Dance", altText: "groovy dance" },
  { id: "g12", label: "Sarcastic", url: "https://media.giphy.com/media/Fml0fgAxVx1eM/200w.gif", category: "Funny", altText: "sarcastic" },
  { id: "g13", label: "Yes!", url: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/200w.gif", category: "Reactions", altText: "yes" },
  { id: "g14", label: "No No", url: "https://media.giphy.com/media/JYZ397GsFrFtu/200w.gif", category: "Funny", altText: "no" },
  { id: "g15", label: "Kiss", url: "https://media.giphy.com/media/G3fPad8N68GfS/200w.gif", category: "Love", altText: "kiss" },
  { id: "g16", label: "Fire", url: "https://media.giphy.com/media/l4FATJpd4LWgeruTK/200w.gif", category: "Trending", altText: "fire" },
  { id: "g17", label: "Confetti", url: "https://media.giphy.com/media/s2qXK8wAvkHTO/200w.gif", category: "Celebrate", altText: "confetti" },
  { id: "g18", label: "Moonwalk", url: "https://media.giphy.com/media/l2JhL1AzTxORUOi7S/200w.gif", category: "Dance", altText: "moonwalk" },
  { id: "g19", label: "Facepalm", url: "https://media.giphy.com/media/XsUtdIeJ0MWMo/200w.gif", category: "Funny", altText: "facepalm" },
  { id: "g20", label: "Cool", url: "https://media.giphy.com/media/62PP2yEIAZF6g/200w.gif", category: "Trending", altText: "cool" },
];

/* ═══════════════ Avatar Moods ═══════════════ */

const AVATAR_MOODS = [
  { label: "Happy", emoji: "😊", color: "from-yellow-400/30 to-orange-400/20", ring: "ring-yellow-400/50" },
  { label: "LOL", emoji: "😂", color: "from-amber-400/30 to-yellow-300/20", ring: "ring-amber-400/50" },
  { label: "Love", emoji: "😍", color: "from-rose-400/30 to-pink-400/20", ring: "ring-rose-400/50" },
  { label: "Cool", emoji: "😎", color: "from-blue-400/30 to-cyan-400/20", ring: "ring-blue-400/50" },
  { label: "Think", emoji: "🤔", color: "from-purple-400/30 to-violet-400/20", ring: "ring-purple-400/50" },
  { label: "Sad", emoji: "🥲", color: "from-sky-400/30 to-blue-400/20", ring: "ring-sky-400/50" },
  { label: "Party", emoji: "🥳", color: "from-fuchsia-400/30 to-pink-400/20", ring: "ring-fuchsia-400/50" },
  { label: "Sleep", emoji: "😴", color: "from-indigo-400/30 to-slate-400/20", ring: "ring-indigo-400/50" },
  { label: "Angry", emoji: "😤", color: "from-red-400/30 to-orange-400/20", ring: "ring-red-400/50" },
  { label: "Shocked", emoji: "😱", color: "from-emerald-400/30 to-teal-400/20", ring: "ring-emerald-400/50" },
  { label: "Wink", emoji: "😜", color: "from-lime-400/30 to-green-400/20", ring: "ring-lime-400/50" },
  { label: "Cry", emoji: "😭", color: "from-blue-300/30 to-indigo-400/20", ring: "ring-blue-300/50" },
];

/* ═══════════════ Music Tracks ═══════════════ */

import { ZIVO_SESSIONS, type ZivoTrack } from "@/lib/zivoSessions";
import {
  searchITunes,
  topChartsITunes,
  COUNTRIES,
  type CountryCode,
  type RemoteTrack,
} from "@/lib/iTunesSearch";

type TrackItem = ZivoTrack & { artworkUrl?: string; source?: "itunes" | "zivo" };
const ZIVO_ORIGINALS: TrackItem[] = ZIVO_SESSIONS.map((t) => ({ ...t, source: "zivo" }));

/* ═══════════════ Store Packs ═══════════════ */

interface StorePackItem {
  name: string;
  count: number;
  emoji: string;
  category: string;
  gradient: string;
  preview: string[];
}

const STORE_PACKS: StorePackItem[] = [
  { name: "Cute Cats", count: 24, emoji: "🐱", category: "Fun", gradient: "from-amber-400 to-orange-500", preview: ["😺","😸","😻","🙀"] },
  { name: "Anime Reactions", count: 32, emoji: "⚡", category: "Anime", gradient: "from-foreground to-foreground/80", preview: ["💫","✨","⚡","🌟"] },
  { name: "Travel Vibes", count: 18, emoji: "✈️", category: "Travel", gradient: "from-foreground to-foreground/80", preview: ["🌍","✈️","🏖️","🗺️"] },
  { name: "Emoji Blast", count: 40, emoji: "💥", category: "Fun", gradient: "from-foreground to-foreground/80", preview: ["🔥","💥","💢","⭐"] },
  { name: "Tokyo Mood", count: 28, emoji: "🗼", category: "Anime", gradient: "from-foreground to-foreground/80", preview: ["🗼","🍜","🎌","🌸"] },
  { name: "Love Language", count: 22, emoji: "💕", category: "Love", gradient: "from-foreground to-foreground/80", preview: ["💕","💌","💋","🌹"] },
  { name: "Sporty", count: 30, emoji: "⚽", category: "Sports", gradient: "from-green-500 to-emerald-600", preview: ["⚽","🏀","🏆","🎯"] },
  { name: "Foodies", count: 36, emoji: "🍕", category: "Food", gradient: "from-orange-400 to-red-500", preview: ["🍕","🍔","🌮","🍰"] },
];

/* ═══════════════ Memes ═══════════════ */

const MEME_ITEMS = [
  { label: "No Way", emoji: "😱", caption: "when you realize it's Monday tomorrow", bg: "bg-gradient-to-br from-red-500/20 to-orange-500/10" },
  { label: "Big Mood", emoji: "🫠", caption: "me after 3 hours of meetings", bg: "bg-gradient-to-br from-yellow-500/20 to-amber-500/10" },
  { label: "Chef's Kiss", emoji: "🤌", caption: "that first coffee in the morning", bg: "bg-gradient-to-br from-emerald-500/20 to-green-500/10" },
  { label: "Legend", emoji: "🫡", caption: "respect earned, not given", bg: "bg-gradient-to-br from-blue-500/20 to-indigo-500/10" },
  { label: "Plot Twist", emoji: "🌀", caption: "nobody saw that coming", bg: "bg-gradient-to-br from-purple-500/20 to-violet-500/10" },
  { label: "Mic Drop", emoji: "🎤", caption: "said what needed to be said", bg: "bg-gradient-to-br from-pink-500/20 to-rose-500/10" },
  { label: "RIP", emoji: "💀", caption: "I'm literally dead", bg: "bg-gradient-to-br from-slate-500/20 to-gray-500/10" },
  { label: "Slay", emoji: "💅", caption: "you better work", bg: "bg-gradient-to-br from-fuchsia-500/20 to-pink-500/10" },
  { label: "Vibing", emoji: "🕺", caption: "living my best life rn", bg: "bg-gradient-to-br from-indigo-500/20 to-blue-500/10" },
  { label: "Bruh", emoji: "🗿", caption: "seriously right now?", bg: "bg-gradient-to-br from-stone-500/20 to-zinc-500/10" },
];

/* ═══════════════ Future Actions ═══════════════ */

const FUTURE_ACTIONS = [
  { label: "Plan Weekend", emoji: "🗓️", text: "Let's plan this weekend ✨", desc: "Create a plan together", gradient: "from-black to-zinc-900", textColor: "text-white" },
  { label: "Split Fare", emoji: "🚗", text: "Let's split the ride fare.", desc: "Share ride costs", gradient: "from-[#ccfbf1] to-[#bbf7f0]", textColor: "text-[#047857]" },
  { label: "Start Poll", emoji: "📊", text: "Quick poll: what do you prefer?", desc: "Get everyone's opinion", gradient: "from-black to-zinc-900", textColor: "text-white" },
  { label: "Book Table", emoji: "🍽️", text: "Let's reserve a table for tonight.", desc: "Restaurant reservation", gradient: "from-[#ffedd5] to-[#fed7aa]", textColor: "text-[#c2410c]" },
  { label: "Trip Idea", emoji: "🧳", text: "Travel idea: weekend city break?", desc: "Plan your next journey", gradient: "from-[#dbeafe] to-[#bfdbfe]", textColor: "text-[#1d4ed8]" },
  { label: "Voice Note", emoji: "🎙️", text: "Send me a quick voice check-in.", desc: "Record a quick message", gradient: "from-black to-zinc-900", textColor: "text-white" },
];

/* ═══════════════ Helpers ═══════════════ */

function getRecentStickers(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 30); } catch { return []; }
}
function addRecentSticker(sticker: string) {
  const recent = getRecentStickers().filter((s) => s !== sticker);
  recent.unshift(sticker);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 30)));
}
function readJsonArray(key: string): string[] {
  try { const d = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(d) ? d : []; } catch { return []; }
}
function writeJsonArray(key: string, values: string[]) { localStorage.setItem(key, JSON.stringify(values)); }
function formatSeconds(total: number): string {
  return `${Math.floor(total / 60)}:${Math.floor(total % 60).toString().padStart(2, "0")}`;
}

/** Detect Spotify / Apple Music link and extract metadata from URL */
function parseMusicLink(url: string): { platform: "spotify" | "apple" | null; display: string } {
  const trimmed = url.trim();
  if (/open\.spotify\.com\/(track|album|playlist)/i.test(trimmed)) {
    const parts = trimmed.split("/").pop()?.split("?")[0] || "";
    return { platform: "spotify", display: `Spotify: ...${parts.slice(-8)}` };
  }
  if (/music\.apple\.com/i.test(trimmed)) {
    return { platform: "apple", display: "Apple Music link" };
  }
  return { platform: null, display: "" };
}

type IllustratedTone = "angry" | "sad" | "sleepy" | "love" | "happy" | "shy" | "float";

interface IllustratedStickerLike {
  id: string;
  src: string;
  alt: string;
  animatedSrc?: string;
}
function getIllustratedTone(stickerId: string): IllustratedTone {
  return /sunflower|cupcake|octopus|hedgehog/.test(stickerId)
    ? "angry"
    : /pear|pig|bunny/.test(stickerId)
      ? "sad"
      : /coffee|potato|penguin/.test(stickerId)
        ? "sleepy"
        : /cat-love/.test(stickerId)
          ? "love"
          : /sushi|toast|hamster|carrot/.test(stickerId)
            ? "happy"
            : /tomato|beet|mushroom|lemon/.test(stickerId)
              ? "shy"
              : "float";
}


/* Cute blink overlay — two tiny eyelid shapes that close periodically */
function BlinkOverlay({ large = false }: { large?: boolean }) {
  const size = large ? 6 : 3.5;
  const gap = large ? 14 : 8;
  const topPct = large ? "32%" : "34%";
  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-center" style={{ paddingTop: topPct }}>
      <motion.div
        className="flex"
        style={{ gap }}
        animate={{ scaleY: [1, 1, 0.05, 0.05, 1, 1] }}
        transition={{
          duration: 3.2,
          repeat: Infinity,
          times: [0, 0.72, 0.75, 0.78, 0.81, 1],
          ease: "easeInOut",
        }}
      >
        <span
          className="rounded-full bg-foreground/80"
          style={{ width: size, height: size * 1.2, transformOrigin: "center" }}
        />
        <span
          className="rounded-full bg-foreground/80"
          style={{ width: size, height: size * 1.2, transformOrigin: "center" }}
        />
      </motion.div>
    </div>
  );
}

/* Breathing glow — subtle pulsing aura behind the sticker */
function BreathingGlow({ tone, large }: { tone: IllustratedTone; large: boolean }) {
  const color = tone === "angry" ? "hsl(0 70% 50% / 0.12)"
    : tone === "love" ? "hsl(340 80% 60% / 0.15)"
    : tone === "happy" ? "hsl(45 90% 55% / 0.12)"
    : tone === "sad" ? "hsl(210 60% 55% / 0.1)"
    : "hsl(var(--primary) / 0.08)";
  const sz = large ? "85%" : "80%";
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute rounded-full blur-xl"
      style={{ width: sz, height: sz, left: "10%", top: "10%", background: color }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function LiveIllustratedStickerArt({
  sticker,
  index = 0,
  large = false,
  withShadow = true,
}: {
  sticker: IllustratedStickerLike;
  index?: number;
  large?: boolean;
  withShadow?: boolean;
}) {
  const tone = getIllustratedTone(sticker.id);
  const motionSpec = getStickerMotionSpec(sticker.id, { large, index });
  const mediaShadowClassName = withShadow && large
    ? "drop-shadow-[0_10px_24px_hsl(var(--foreground)/0.18)]"
    : undefined;
  const mediaElement = sticker.animatedSrc ? (
    <TransparentStickerVideo
      src={sticker.animatedSrc}
      fallbackSrc={sticker.src}
      alt={sticker.alt}
      preload={large ? "auto" : "metadata"}
      renderMode={large ? "chroma" : "blend"}
      whiteKeyEnabled={true}
      className={mediaShadowClassName}
    />
  ) : (
    <img
      src={sticker.src}
      alt={sticker.alt}
	      className={cn("h-full w-full object-contain pointer-events-none", mediaShadowClassName)}
	      loading="lazy"
	      decoding="async"
	    />
  );

  // Grid mode: use static PNG thumbnails for performance (no video in grid)
  if (!large) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <img
          src={sticker.src}
          alt={sticker.alt}
	          className="h-full w-full object-contain pointer-events-none"
	          loading="lazy"
	          decoding="async"
	        />
      </div>
    );
  }

  // Large preview mode: full effects
  return (
    <>
      <BreathingGlow tone={tone} large={large} />

      {withShadow && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-[12%] bottom-[8%] h-5 rounded-full bg-foreground/10 blur-xl"
          animate={motionSpec.shadow.animate}
          transition={motionSpec.shadow.transition}
        />
      )}

      {tone === "angry" && (
        <>
          <motion.span aria-hidden className="pointer-events-none absolute left-0 top-1 text-[9px] leading-none text-destructive/80" animate={{ y: [0, -8, -13], opacity: [0, 1, 0], scale: [0.4, 1.15, 0.5] }} transition={{ duration: 0.8, repeat: Infinity, delay: index * 0.05 }}>🔥</motion.span>
          <motion.span aria-hidden className="pointer-events-none absolute right-1 top-0 h-2 w-2 rounded-full bg-destructive/60 blur-[2px]" animate={{ y: [0, -6, -10], opacity: [0, 0.9, 0], scale: [0.3, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 + index * 0.04 }} />
        </>
      )}

      {tone === "sad" && (
        <>
          <motion.span aria-hidden className="pointer-events-none absolute right-1.5 top-2 text-[8px] leading-none text-primary/70" animate={{ y: [-2, 8, 14], opacity: [0, 1, 0], scaleY: [0.6, 1, 0.5] }} transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.03 }}>💧</motion.span>
          <motion.span aria-hidden className="pointer-events-none absolute left-2 top-4 h-2 w-1 rounded-full bg-primary/40" animate={{ y: [-1, 6, 10], opacity: [0, 0.8, 0], scaleY: [0.7, 1, 0.5] }} transition={{ duration: 1.3, repeat: Infinity, delay: 0.4 + index * 0.03 }} />
        </>
      )}

      {tone === "sleepy" && (
        <>
          <motion.span aria-hidden className="pointer-events-none absolute right-0 top-0 text-[10px] font-bold leading-none text-primary/50" animate={{ y: [0, -10, -16], x: [0, 3, 6], opacity: [0, 0.85, 0], scale: [0.4, 1.2, 1.5] }} transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.04 }}>z</motion.span>
          <motion.span aria-hidden className="pointer-events-none absolute right-2 top-2 text-[8px] font-bold leading-none text-primary/40" animate={{ y: [0, -6, -10], x: [0, 2, 3], opacity: [0, 0.7, 0], scale: [0.5, 1, 1.2] }} transition={{ duration: 1.6, repeat: Infinity, delay: 0.5 + index * 0.04 }}>z</motion.span>
        </>
      )}

      {tone === "love" && (
        <>
          <motion.span aria-hidden className="pointer-events-none absolute left-0 top-0 text-[11px] leading-none" animate={{ y: [0, -10, -16], x: [0, -3, -5], opacity: [0, 1, 0], scale: [0.5, 1.15, 0.7], rotate: [0, -15, -25] }} transition={{ duration: 1.3, repeat: Infinity, delay: index * 0.04 }}>💕</motion.span>
          <motion.span aria-hidden className="pointer-events-none absolute right-0 top-1 text-[9px] leading-none" animate={{ y: [0, -8, -13], x: [0, 3, 5], opacity: [0, 1, 0], scale: [0.4, 1, 0.6], rotate: [0, 10, 20] }} transition={{ duration: 1.3, repeat: Infinity, delay: 0.4 + index * 0.04 }}>❤️</motion.span>
        </>
      )}

      {tone === "happy" && (
        <>
          <motion.span aria-hidden className="pointer-events-none absolute right-1 top-0 text-[10px] leading-none" animate={{ y: [0, -7, -11], rotate: [0, 15, 30], opacity: [0, 1, 0], scale: [0.5, 1.2, 0.7] }} transition={{ duration: 1, repeat: Infinity, delay: index * 0.03 }}>✨</motion.span>
          <motion.span aria-hidden className="pointer-events-none absolute left-1 top-1 text-[8px] leading-none" animate={{ y: [0, -5, -8], opacity: [0, 0.9, 0], scale: [0.4, 1, 0.6] }} transition={{ duration: 1, repeat: Infinity, delay: 0.3 + index * 0.03 }}>⭐</motion.span>
        </>
      )}

      {tone === "shy" && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute flex justify-between"
          style={{ left: "18%", right: "18%", top: "48%", gap: 20 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="rounded-full bg-secondary" style={{ width: 8, height: 5 }} />
          <span className="rounded-full bg-secondary" style={{ width: 8, height: 5 }} />
        </motion.div>
      )}

      <motion.div
        className="relative flex h-full w-full items-center justify-center"
        animate={motionSpec.wrapper.animate}
        transition={motionSpec.wrapper.transition}
        style={{ transformOrigin: motionSpec.wrapper.transformOrigin }}
      >
        <motion.div
          className="h-full w-full"
          animate={motionSpec.media.animate}
          transition={motionSpec.media.transition}
          style={{ transformOrigin: motionSpec.media.transformOrigin }}
        >
          {mediaElement}
        </motion.div>
      </motion.div>
    </>
  );
}

/* ═══════════════ Supabase Store Tab ═══════════════ */

const GRADIENT_COLORS = [
  "from-amber-400 to-orange-500",
  "from-violet-500 to-purple-600",
  "from-sky-400 to-blue-600",
  "from-rose-500 to-red-600",
  "from-pink-400 to-fuchsia-600",
  "from-emerald-500 to-teal-600",
  "from-cyan-400 to-blue-500",
  "from-orange-400 to-red-500",
];

function SupabaseStoreTab({ search }: { search: string }) {
  const { data: packs, isLoading } = useSupabaseStickerPacks();
  const { data: installedIds = [] } = useUserInstalledPacks();
  const toggleMutation = useToggleStickerPack();
  const [previewPackId, setPreviewPackId] = useState<string | null>(null);
  const { data: previewStickers } = useSupabaseStickers(previewPackId);

  const filtered = useMemo(() => {
    if (!packs) return [];
    const q = search.trim().toLowerCase();
    if (!q) return packs;
    return packs.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q)
    );
  }, [packs, search]);

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center gap-3">
        <motion.div
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-xs text-muted-foreground">Loading sticker store...</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <p className="text-sm font-bold text-foreground">Sticker Store</p>
      {filtered && filtered.length > 0 && (
        <div className="flex gap-2 mb-2">
          <span className="text-xs text-muted-foreground">{filtered.length} packs available</span>
          {installedIds.length > 0 && (
            <span className="text-xs text-primary font-medium">{installedIds.length} installed</span>
          )}
        </div>
      )}

      {filtered && filtered.map((pack, idx) => {
        const installed = installedIds.includes(pack.id);
        const isPreviewing = previewPackId === pack.id;
        return (
          <motion.div
            key={`${pack.id}-${idx}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-border/30 overflow-hidden"
          >
            <div
              className={`bg-gradient-to-r ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]} px-4 py-3 flex items-center justify-between cursor-pointer`}
              onClick={() => setPreviewPackId(isPreviewing ? null : pack.id)}
            >
              <div className="flex items-center gap-3">
                {pack.preview_url ? (
	                  <img src={pack.preview_url} alt={pack.name} className="w-10 h-10 rounded-xl object-cover" loading="lazy" decoding="async" />
                ) : (
                  <span className="text-3xl">📦</span>
                )}
                <div>
                  <p className="text-sm font-bold text-white drop-shadow">{pack.name}</p>
                  <p className="text-xs text-white/80">
                    {pack.sticker_count || 0} stickers
                    {pack.category && ` · ${pack.category}`}
                    {(pack.download_count || 0) > 0 && ` · ${pack.download_count} downloads`}
                  </p>
                </div>
              </div>
              <button type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMutation.mutate({ packId: pack.id, installed });
                }}
                disabled={toggleMutation.isPending}
                className={`h-8 px-4 rounded-full text-xs font-bold shadow-lg transition-all ${
                  installed
                    ? "bg-white/20 text-white backdrop-blur"
                    : "bg-white text-gray-900 hover:bg-white/90"
                }`}
              >
                {installed ? (
                  <><Check className="w-3.5 h-3.5 inline mr-1" />Added</>
                ) : (
                  <><Download className="w-3.5 h-3.5 inline mr-1" />{pack.is_premium ? `$${((pack.price_cents || 0) / 100).toFixed(2)}` : "Get"}</>
                )}
              </button>
            </div>

            <AnimatePresence>
              {isPreviewing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-3 grid grid-cols-5 gap-2">
                    {previewStickers && previewStickers.length > 0 ? (
                      previewStickers.slice(0, 10).map((s, idx) => (
                        // Composite key prevents React duplicate-key warnings
                        // when the same sticker.id appears more than once in
                        // a preview pack (rare but happens with seeded data).
                        <div key={`${s.id}-${idx}`} className="aspect-square rounded-xl bg-muted/20 flex items-center justify-center p-1">
	                          <img src={s.image_url} alt={s.name || "sticker"} className="w-full h-full object-contain" loading="lazy" decoding="async" />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-5 py-2 text-center">
                        <p className="text-xs text-muted-foreground">Loading stickers...</p>
                      </div>
                    )}
                  </div>
                  {previewStickers && previewStickers.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pb-2">
                      +{previewStickers.length - 10} more stickers
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Built-in packs */}
      <div className="pt-3 border-t border-border/20">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Built-in Packs</p>
        {ILLUSTRATED_PACKS.map((pack, idx) => (
          <div key={`${pack.id}-${idx}`} className="rounded-2xl border border-border/20 overflow-hidden mb-2">
            <div className={`bg-gradient-to-r ${GRADIENT_COLORS[(idx + (filtered?.length || 0)) % GRADIENT_COLORS.length]} px-4 py-2.5 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{pack.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white drop-shadow">{pack.name}</p>
                  <p className="text-xs text-white/80">{pack.stickers.length} stickers</p>
                </div>
              </div>
              <span className="h-7 px-3 rounded-full bg-white/20 text-white text-[11px] font-bold inline-flex items-center backdrop-blur">
                <Check className="w-3 h-3 mr-1" /> Included
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Component ═══════════════ */

export default function StickerKeyboard({ open, onClose, onSendSticker, onQuickAction, onStartVoice, onOpenCamera }: StickerKeyboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("stickers");
  const [activePack, setActivePack] = useState(1000); // Default to first illustrated pack
  const [search, setSearch] = useState("");
  const [gifCategory, setGifCategory] = useState<GifCategory | "All">("All");
  const [recentStickers, setRecentStickers] = useState<string[]>([]);
  const [remotePacks, setRemotePacks] = useState<StickerPack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [favoriteTracks, setFavoriteTracks] = useState<string[]>([]);
  const [recentTracks, setRecentTracks] = useState<string[]>([]);
  const [installedPacks, setInstalledPacks] = useState<string[]>([]);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [musicLinkInput, setMusicLinkInput] = useState("");
  const [musicLinkParsed, setMusicLinkParsed] = useState<ReturnType<typeof parseMusicLink> | null>(null);
  const [musicCountry, setMusicCountry] = useState<CountryCode>(() => (localStorage.getItem("zivo_music_country") as CountryCode) || "KH");
  const [chartTracks, setChartTracks] = useState<RemoteTrack[]>([]);
  const [searchTracks, setSearchTracks] = useState<RemoteTrack[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [musicSubtab, setMusicSubtab] = useState<"charts" | "originals">("charts");
  const [previewSticker, setPreviewSticker] = useState<{ id: string; src: string; alt: string } | null>(null);
  const [favoriteStickers, setFavoriteStickers] = useState<string[]>([]);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Load state on open */
  useEffect(() => {
    if (!open) return;
    const savedTab = localStorage.getItem(LAST_TAB_KEY) as TabKey | null;
    setActiveTab(savedTab || "stickers");
    setSearch("");
    setGifCategory("All");
    setActivePack(1000);
    setMusicLinkInput("");
    setMusicLinkParsed(null);
    setRecentStickers(getRecentStickers());
    setFavoriteTracks(readJsonArray(FAV_TRACKS_KEY));
    setRecentTracks(readJsonArray(RECENT_TRACKS_KEY));
    setInstalledPacks(readJsonArray(STORE_INSTALLED_KEY));
    setFavoriteStickers(readJsonArray("zivo_fav_stickers"));

    const loadPacks = async () => {
      const { data } = await (supabase as any)
        .from("chat_sticker_packs" as any)
        .select("id, name, emoji_prefix, stickers")
        .order("created_at", { ascending: true });
      if (!data) { setRemotePacks([]); return; }
      const rows = data as StickerPackRow[];
      setRemotePacks(
        rows.map((p) => ({
          id: p.id, name: p.name, emoji_prefix: p.emoji_prefix || "✨",
          stickers: parseStickerList(p.stickers),
        })).filter((p: StickerPack) => p.stickers.length > 0)
      );
    };
    void loadPacks();
  }, [open]);

  useEffect(() => { localStorage.setItem(LAST_TAB_KEY, activeTab); }, [activeTab]);

  /* Cleanup audio */
  useEffect(() => {
    return () => {
      if (audioTickRef.current) clearInterval(audioTickRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  /* Music link detection */
  useEffect(() => {
    if (musicLinkInput.trim().length > 10) {
      setMusicLinkParsed(parseMusicLink(musicLinkInput));
    } else {
      setMusicLinkParsed(null);
    }
  }, [musicLinkInput]);

  /* ── Sticker packs ── */
  const packs = useMemo<StickerPack[]>(() => {
    if (remotePacks.length > 0) return remotePacks;
    return Object.entries(BUILTIN_STICKERS).map(([name, stickers], i) => ({
      id: `builtin-${i}`, name, emoji_prefix: stickers[0] || "😀", stickers,
    }));
  }, [remotePacks]);

  const illustratedPacks: IllustratedStickerPack[] = ILLUSTRATED_PACKS;

  // Illustrated packs offset: activePack values >= 1000 are illustrated
  const isIllustratedPack = activePack >= 1000;
  const illustratedPackIndex = activePack - 1000;
  const currentIllustratedPack = isIllustratedPack ? illustratedPacks[illustratedPackIndex] : null;

  const currentPack = !isIllustratedPack ? packs[activePack] : null;
  const filteredStickers = useMemo(() => {
    const list = currentPack?.stickers || [];
    if (!search.trim()) return list;
    return list.filter((s) => s.toLowerCase().includes(search.trim().toLowerCase()));
  }, [currentPack?.stickers, search]);

  const filteredIllustratedStickers = useMemo(() => {
    if (!currentIllustratedPack) return [];
    const q = search.trim().toLowerCase();
    if (!q) return currentIllustratedPack.stickers;
    return currentIllustratedPack.stickers.filter((s) => s.alt.toLowerCase().includes(q));
  }, [currentIllustratedPack, search]);

  /* ── Actions ── */
  const sendSticker = useCallback((sticker: string) => {
    addRecentSticker(sticker);
    setRecentStickers(getRecentStickers());
    onSendSticker({ text: sticker, messageType: "sticker" });
    onClose();
  }, [onSendSticker, onClose]);

  const quickSend = useCallback((text: string, messageType: "gif" | "text" = "text") => {
    onSendSticker({ text, messageType });
    onClose();
  }, [onSendSticker, onClose]);

  const toggleTrackPreview = useCallback(async (trackKey: string, previewUrl: string) => {
    try {
      if (playingTrackId === trackKey && audioRef.current) {
        audioRef.current.pause();
        setPlayingTrackId(null);
        if (audioTickRef.current) { clearInterval(audioTickRef.current); audioTickRef.current = null; }
        return;
      }
      if (!audioRef.current) audioRef.current = new Audio();
      audioRef.current.pause();
      audioRef.current.src = previewUrl;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setPlayingTrackId(trackKey);
      setAudioDuration(audioRef.current.duration || 0);
      if (audioTickRef.current) clearInterval(audioTickRef.current);
      audioTickRef.current = setInterval(() => {
        if (!audioRef.current) return;
        setAudioProgress(audioRef.current.currentTime || 0);
        setAudioDuration(audioRef.current.duration || 0);
      }, 250);
      audioRef.current.onended = () => {
        setPlayingTrackId(null);
        setAudioProgress(0);
        if (audioTickRef.current) { clearInterval(audioTickRef.current); audioTickRef.current = null; }
      };
    } catch {
      setPlayingTrackId(null);
      toast.error("Song preview unavailable");
    }
  }, [playingTrackId]);

  const toggleFavoriteTrack = useCallback((trackKey: string) => {
    setFavoriteTracks((prev) => {
      const next = prev.includes(trackKey) ? prev.filter((id) => id !== trackKey) : [trackKey, ...prev].slice(0, 25);
      writeJsonArray(FAV_TRACKS_KEY, next);
      return next;
    });
  }, []);

  const registerRecentTrack = useCallback((trackKey: string) => {
    setRecentTracks((prev) => {
      const next = [trackKey, ...prev.filter((id) => id !== trackKey)].slice(0, 10);
      writeJsonArray(RECENT_TRACKS_KEY, next);
      return next;
    });
  }, []);

  const toggleInstallPack = useCallback((packName: string) => {
    setInstalledPacks((prev) => {
      const next = prev.includes(packName) ? prev.filter((n) => n !== packName) : [...prev, packName];
      writeJsonArray(STORE_INSTALLED_KEY, next);
      toast.success(next.includes(packName) ? `${packName} installed!` : `${packName} removed`);
      return next;
    });
  }, []);

  /* ── Filtered data ── */
  // Live Tenor results when the GIFs tab is open. Fetches from the
  // `tenor-gif-search` edge function (which proxies the API key). Falls back
  // to the bundled GIF_ITEMS catalog if the edge function reports the API key
  // isn't configured, so the tab is never empty.
  const [tenorResults, setTenorResults] = useState<GifItem[]>([]);
  const [tenorLoading, setTenorLoading] = useState(false);
  const [tenorBackend, setTenorBackend] = useState<"tenor" | "none" | "unknown">("unknown");

  useEffect(() => {
    if (!open || activeTab !== "gifs") return;
    let cancelled = false;
    const q = search.trim();
    // Map the visible category chip into a Tenor query when there's no
    // explicit search term. "All" / "Trending" just hit the featured feed.
    const categoryQuery =
      gifCategory === "All" || gifCategory === "Trending" ? "" : gifCategory.toLowerCase();
    const finalQuery = q || categoryQuery;

    setTenorLoading(true);
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ limit: "30" });
        if (finalQuery) params.set("q", finalQuery);
        const { data, error } = await supabase.functions.invoke("tenor-gif-search", {
          body: null,
          // Functions client doesn't support GET; pass query in URL via direct fetch.
        }).catch(() => ({ data: null, error: { message: "invoke_failed" } } as any));
        // Fallback to direct fetch with query string (functions.invoke strips query).
        const projectUrl = (supabase as any).supabaseUrl ?? "";
        const res = await fetch(`${projectUrl}/functions/v1/tenor-gif-search?${params.toString()}`, {
          headers: { "apikey": (supabase as any).supabaseKey ?? "" },
        });
        const json = await res.json();
        if (cancelled) return;
        const cat = (gifCategory === "All" ? "Trending" : gifCategory) as GifCategory;
        const mapped: GifItem[] = (json.results ?? []).map((g: any) => ({
          id: g.id,
          label: g.label,
          url: g.preview || g.url,
          category: cat,
          altText: g.altText,
        }));
        setTenorResults(mapped);
        setTenorBackend(json.source === "tenor" ? "tenor" : "none");
        // Suppress unused-warning for `data`/`error` from the no-op invoke above.
        void data; void error;
      } catch {
        if (!cancelled) setTenorBackend("none");
      } finally {
        if (!cancelled) setTenorLoading(false);
      }
    }, q ? 250 : 0);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [open, activeTab, search, gifCategory]);

  const filteredGifs = useMemo(() => {
    // Prefer live Tenor when the backend is configured. Otherwise filter the
    // bundled catalog by category + search term so the tab still has content.
    if (tenorBackend === "tenor") return tenorResults;
    const q = search.trim().toLowerCase();
    const byCategory = gifCategory === "All" ? GIF_ITEMS : GIF_ITEMS.filter((g) => g.category === gifCategory);
    if (!q) return byCategory;
    return byCategory.filter((g) => g.label.toLowerCase().includes(q) || g.altText.toLowerCase().includes(q));
  }, [gifCategory, search, tenorBackend, tenorResults]);

  // Music tab data: when search is empty → show top charts (or Zivo Originals on
  // the Originals subtab); when search has text → debounced iTunes API call.
  useEffect(() => {
    if (!open || activeTab !== "music") return;
    if (musicSubtab !== "charts") return;
    let cancelled = false;
    setMusicLoading(true);
    setMusicError(null);
    topChartsITunes(musicCountry, 25)
      .then((tracks) => { if (!cancelled) setChartTracks(tracks); })
      .catch((e) => { if (!cancelled) setMusicError(e?.message || "Couldn't load charts"); })
      .finally(() => { if (!cancelled) setMusicLoading(false); });
    return () => { cancelled = true; };
  }, [open, activeTab, musicSubtab, musicCountry]);

  useEffect(() => {
    if (!open || activeTab !== "music") return;
    const q = search.trim();
    if (!q) { setSearchTracks([]); return; }
    let cancelled = false;
    setMusicLoading(true);
    setMusicError(null);
    const handle = setTimeout(() => {
      searchITunes(q, musicCountry, 25)
        .then((tracks) => { if (!cancelled) setSearchTracks(tracks); })
        .catch((e) => { if (!cancelled) setMusicError(e?.message || "Search failed"); })
        .finally(() => { if (!cancelled) setMusicLoading(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [open, activeTab, search, musicCountry]);

  useEffect(() => { localStorage.setItem("zivo_music_country", musicCountry); }, [musicCountry]);

  const filteredTracks = useMemo<TrackItem[]>(() => {
    const q = search.trim().toLowerCase();
    if (q) return searchTracks;
    if (musicSubtab === "originals") {
      return ZIVO_ORIGINALS;
    }
    // If the iTunes chart fetch failed or returned nothing, fall back to the
    // bundled Zivo Originals so the music tab is never empty (especially on
    // iOS WebView where some chart endpoints can be flaky).
    if (chartTracks.length === 0) return ZIVO_ORIGINALS;
    return chartTracks;
  }, [search, searchTracks, chartTracks, musicSubtab]);

  if (!open) return null;

  const searchPlaceholders: Record<TabKey, string> = {
    stickers: "Search stickers",
    gifs: "Search GIFs",
    avatar: "Search mood",
    music: "Search songs or artists",
    store: "Search sticker packs",
    memes: "Search memes",
    future: "Search actions",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-background border-t border-border/30 rounded-t-3xl shadow-2xl max-h-[58vh] overflow-hidden flex flex-col"
      >
        {/* ── Compact header ── */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/20 px-3 pt-2 pb-1.5 z-10 shrink-0 pt-safe">
          <div className="w-12 h-1 rounded-full bg-muted mx-auto mb-2" />

          {/* Tab row + Done */}
          <div className="flex items-center gap-1">
            <div className="flex-1 flex items-center gap-0.5 bg-muted/30 rounded-2xl p-0.5">
              {([
                { key: "stickers" as TabKey, label: "Stickers", icon: Smile },
                { key: "gifs" as TabKey, label: "GIFs", icon: ImageIcon },
                { key: "avatar" as TabKey, label: "Avatar", icon: UserRound },
                { key: "music" as TabKey, label: "Music", icon: Music2 },
                { key: "store" as TabKey, label: "Store", icon: Store },
                { key: "memes" as TabKey, label: "Memes", icon: Sparkles },
                { key: "future" as TabKey, label: "Future", icon: Rocket },
              ]).map((tab) => (
                <button type="button"
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearch(""); }}
                  className={cn(
                    "flex-1 rounded-xl px-0.5 py-1.5 flex flex-col items-center gap-0 transition-all",
                    activeTab === tab.key
                      ? "bg-background text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-[8px] font-semibold leading-tight mt-0.5">{tab.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close stickers"
              className="text-primary text-xs font-semibold px-2 py-1 rounded-lg hover:bg-primary/10 shrink-0"
            >
              Done
            </button>
          </div>

          {/* Search — only show for non-sticker tabs or when there's a search query */}
          {(activeTab !== "stickers" || search) && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholders[activeTab]}
                  className="w-full h-8 rounded-full bg-muted/30 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ═══ STICKERS ═══ */}
          {activeTab === "stickers" && (
            <>

              {/* Pack icon strip — polished Messenger-style */}
              <div className="flex px-2 py-2 gap-1 overflow-x-auto scrollbar-none border-b border-border/10">
                {recentStickers.length > 0 && (
                  <button type="button"
                    onClick={() => setActivePack(-1)}
                    title="Recent"
                    className={cn(
                      "h-10 w-10 rounded-2xl grid place-items-center shrink-0 transition-all border",
                      activePack === -1
                        ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
                        : "text-muted-foreground border-transparent hover:bg-muted/40"
                    )}
                  >
                    <Clock className="w-4.5 h-4.5" />
                  </button>
                )}
                {illustratedPacks.map((pack, i) => (
                  <button type="button"
                    key={`${pack.id}-${i}`}
                    onClick={() => setActivePack(1000 + i)}
                    title={pack.name}
                    className={cn(
                      "h-10 w-10 rounded-2xl grid place-items-center shrink-0 transition-all border overflow-hidden",
                      activePack === 1000 + i
                        ? "bg-primary/10 border-primary/30 shadow-sm scale-110"
                        : "border-transparent hover:bg-muted/40"
                    )}
                  >
                    <img
	                      src={pack.stickers[0]?.src}
	                      alt={pack.name}
	                      className="h-8 w-8 object-contain"
	                      loading="lazy"
	                      decoding="async"
	                    />
                  </button>
                ))}


              </div>

              {/* Pack name — hidden for illustrated packs (Facebook-style) */}
              {!isIllustratedPack && (
                <div className="px-4 pt-2.5 pb-1">
                  <h3 className="text-[13px] font-bold text-foreground tracking-tight">
                    {activePack === -1 ? "Recently Used" : (currentPack?.name ?? "")}
                  </h3>
                </div>
              )}

              {/* Sticker grid */}
              <div className="overflow-y-auto p-2">
                {isIllustratedPack ? (
                  <>
                    {/* Sticker grid — 4 columns, Facebook-style */}
                    <div className="grid grid-cols-4 gap-2 px-2 pb-3">
                      {filteredIllustratedStickers.map((sticker, idx) => {
                        const stickerPayload = `[sticker:${sticker.id}]`;
                        let didLongPress = false;

                        return (
                          <motion.button
                            key={`${currentIllustratedPack?.id ?? "illustrated"}-${sticker.id}-${idx}`}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(idx * 0.015, 0.3), duration: 0.15 }}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.85 }}
                            onTouchStart={() => {
                              didLongPress = false;
                              longPressRef.current = setTimeout(() => {
                                didLongPress = true;
                                setPreviewSticker(sticker);
                                if (navigator.vibrate) navigator.vibrate(10);
                              }, 400);
                            }}
                            onTouchEnd={(e) => {
                              if (longPressRef.current) clearTimeout(longPressRef.current);
                              if (!didLongPress) { e.preventDefault(); sendSticker(stickerPayload); }
                            }}
                            onTouchMove={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
                            onContextMenu={(e) => { e.preventDefault(); setPreviewSticker(sticker); }}
                            onClick={() => sendSticker(stickerPayload)}
                            style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTapHighlightColor: "transparent" } as React.CSSProperties}
                            className="group relative aspect-square overflow-visible rounded-2xl hover:bg-muted/30 transition-colors p-0"
                          >
                            <LiveIllustratedStickerArt sticker={{ ...sticker, animatedSrc: getAnimatedStickerUrl(sticker.id) }} index={idx} />
                          </motion.button>
                        );
                      })}
                    </div>

                  
                  </>
                ) : (
                  /* Emoji sticker grid */
                  <div className="grid grid-cols-8 gap-0.5">
                    {(activePack === -1 ? recentStickers : filteredStickers).map((sticker, i) => (
                      <button type="button" key={`${sticker}-${i}`} onClick={() => sendSticker(sticker)}
                        className="aspect-square flex items-center justify-center text-2xl rounded-lg hover:bg-muted/60 active:scale-90 transition-all">
                        {sticker}
                      </button>
                    ))}
                  </div>
                )}
                {!isIllustratedPack && activePack !== -1 && filteredStickers.length === 0 && (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No stickers found</div>
                )}
                {isIllustratedPack && filteredIllustratedStickers.length === 0 && (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No stickers found</div>
                )}
              </div>
            </>
          )}

          {/* ═══ GIFs — animated thumbnails ═══ */}
          {activeTab === "gifs" && (
            <div className="p-3 space-y-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {(["All", ...GIF_CATEGORIES] as const).map((cat) => (
                  <button type="button" key={cat} onClick={() => setGifCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      gifCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
                    }`}>{cat}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {filteredGifs.map((gif, gIdx) => (
                  <button type="button" key={`${gif.id}-${gIdx}`} onClick={() => quickSend(`[GIF] ${gif.label}: ${gif.url}`, "gif")}
                    className="relative rounded-xl overflow-hidden border border-border/20 hover:border-primary/40 transition-all active:scale-95 aspect-square bg-muted/20">
	                    <img src={gif.url} alt={gif.altText} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                      <p className="text-[11px] font-semibold text-white">{gif.label}</p>
                    </div>
                  </button>
                ))}
              </div>
              {tenorLoading && filteredGifs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Loading GIFs…</p>
              )}
              {!tenorLoading && filteredGifs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No GIFs found</p>
              )}
              {tenorBackend === "none" && filteredGifs.length > 0 && (
                <p className="text-[10px] text-muted-foreground/70 text-center pt-1">
                  Showing built-in GIFs. Set TENOR_API_KEY for live search.
                </p>
              )}
            </div>
          )}

          {/* ═══ AVATAR — mood circles ═══ */}
          {activeTab === "avatar" && (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-bold text-foreground">Your Avatar Moods</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tap a mood to send your avatar sticker</p>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_MOODS.filter((m) => !search.trim() || m.label.toLowerCase().includes(search.trim().toLowerCase())).map((mood) => (
                  <button type="button" key={mood.label} onClick={() => quickSend(`${mood.emoji} ${mood.label}`)} className="flex flex-col items-center gap-2 group">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${mood.color} ring-2 ${mood.ring} flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`}>
                      {mood.emoji}
                    </div>
                    <p className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{mood.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ MUSIC — album cards + link sharing ═══ */}
          {activeTab === "music" && (
            <div className="p-3 space-y-3">
              {/* Sub-tabs + country selector — top of the music tab so users
                  see them before the long results list. */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
                  <button type="button"
                    onClick={() => setMusicSubtab("charts")}
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition ${musicSubtab === "charts" && !search.trim() ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  >Top Charts</button>
                  <button type="button"
                    onClick={() => setMusicSubtab("originals")}
                    className={`h-7 px-3 rounded-full text-xs font-semibold transition ${musicSubtab === "originals" && !search.trim() ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                  >Originals</button>
                </div>
                <select
                  value={musicCountry}
                  onChange={(e) => setMusicCountry(e.target.value as CountryCode)}
                  className="h-7 rounded-full bg-muted/40 px-2 text-xs font-semibold text-foreground"
                  aria-label="Country"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Collapsible: paste-a-link for users who want to share a
                  Spotify / Apple Music URL directly. Hidden by default since
                  the search box above covers 99% of cases. */}
              <details className="group rounded-xl border border-border/20 bg-muted/10">
                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none">
                  <Link2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs font-semibold text-foreground">Or paste a Spotify / Apple Music link</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-auto text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-3 pb-3 pt-1">
                  <div className="flex gap-2">
                    <input
                      value={musicLinkInput}
                      onChange={(e) => setMusicLinkInput(e.target.value)}
                      placeholder="Paste link…"
                      className="flex-1 h-9 rounded-full bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/60"
                    />
                    {musicLinkParsed?.platform ? (
                      <button type="button"
                        onClick={() => {
                          quickSend(`🎵 ${musicLinkParsed.platform === "spotify" ? "🟢 Spotify" : "🍎 Apple Music"}\n${musicLinkInput.trim()}`);
                          setMusicLinkInput("");
                        }}
                        className="h-9 px-3 rounded-full bg-green-500 text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        <Send className="w-3 h-3" /> Share
                      </button>
                    ) : musicLinkInput.trim() ? (
                      <button type="button" onClick={() => setMusicLinkInput("")} className="h-9 w-9 rounded-full bg-muted/40 inline-flex items-center justify-center shrink-0">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ) : null}
                  </div>
                  {musicLinkParsed?.platform && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-2">
                      <span className="text-lg">{musicLinkParsed.platform === "spotify" ? "🟢" : "🍎"}</span>
                      <span className="text-xs text-muted-foreground">{musicLinkParsed.display}</span>
                      <Check className="w-3.5 h-3.5 text-green-500 ml-auto" />
                    </motion.div>
                  )}
                </div>
              </details>

              {musicLoading && filteredTracks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
              )}
              {musicError && !musicLoading && filteredTracks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Couldn't load. Pull down to retry.</p>
              )}

              {filteredTracks.map((track, index) => {
                const stableId = track.slug || `track-${index}`;
                const reactKey = `${stableId}-${index}`;
                const trackKey = stableId;
                const isPlaying = playingTrackId === trackKey;
                const isFavorite = favoriteTracks.includes(trackKey);
                const artwork = (track as any).artworkUrl as string | undefined;

                return (
                  <div key={reactKey} className="rounded-2xl border border-border/30 overflow-hidden hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-3 p-3">
                      <button type="button" onClick={() => void toggleTrackPreview(trackKey, track.previewUrl)}
                        className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${track.coverGradient} flex items-center justify-center shrink-0 shadow-lg overflow-hidden`}>
                        {artwork && (
	                          <img src={artwork} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
                        )}
                        <span className="relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm">
                          {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                        </span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">{track.genre}</span>
                          <span className="text-[10px] text-muted-foreground">{track.duration}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => toggleFavoriteTrack(trackKey)} className="p-1.5">
                        <Heart className={`w-4 h-4 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                      </button>
                      <button type="button" onClick={() => {
                        registerRecentTrack(trackKey);
                        const lines = [
                          `🎵 ${track.title} — ${track.artist}`,
                          `${track.genre} · ${track.duration}`,
                          `Listen: ${track.shareUrl || `https://hizovo.com/sound/${track.slug}`}`,
                          `Preview: ${track.previewUrl}`,
                        ];
                        quickSend(lines.join("\n"));
                      }} className="h-8 px-3 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1">
                        <Send className="w-3 h-3" /> Send
                      </button>
                    </div>
                    {isPlaying && (
                      <div className="px-3 pb-2">
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <motion.div className="h-full bg-primary rounded-full"
                            style={{ width: `${audioDuration > 0 ? Math.min(100, (audioProgress / audioDuration) * 100) : 0}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[10px] text-muted-foreground">{formatSeconds(audioProgress)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatSeconds(audioDuration)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!musicLoading && filteredTracks.length === 0 && search.trim() && (
                <p className="text-xs text-muted-foreground text-center py-6">No songs found for “{search.trim()}”</p>
              )}
            </div>
          )}

          {/* ═══ STORE — Supabase-backed sticker packs ═══ */}
          {activeTab === "store" && (
            <SupabaseStoreTab search={search} />
          )}

          {/* ═══ MEMES — gradient cards ═══ */}
          {activeTab === "memes" && (
            <div className="p-3 space-y-3">
              <div>
                <p className="text-sm font-bold text-foreground">Meme Reactions</p>
                <p className="text-xs text-muted-foreground">Quick meme-style reactions for chat</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MEME_ITEMS.filter((m) => !search.trim() || m.label.toLowerCase().includes(search.trim().toLowerCase())).map((item) => (
                  <button type="button" key={item.label} onClick={() => quickSend(`${item.emoji} ${item.label}\n"${item.caption}"`)}
                    className={`rounded-2xl ${item.bg} border border-border/20 p-4 text-left hover:scale-[1.02] active:scale-95 transition-all`}>
                    <p className="text-4xl mb-2">{item.emoji}</p>
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 italic">"{item.caption}"</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ═══ FUTURE — action cards ═══ */}
          {activeTab === "future" && (
            <div className="p-3 space-y-3">
              <div>
                <p className="text-sm font-bold text-foreground">Quick Actions</p>
                <p className="text-xs text-muted-foreground">One-tap workflows for modern chat</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FUTURE_ACTIONS.map((item) => (
                  <button type="button" key={item.label} onClick={() => {
                    if (onQuickAction) {
                      onQuickAction(item.label.toLowerCase().replace(/\s+/g, "-"));
                    } else {
                      quickSend(`${item.emoji} ${item.text}`);
                    }
                  }}
                    className={cn(
                      "rounded-2xl bg-gradient-to-br border border-border/20 p-4 text-left hover:scale-[1.02] active:scale-95 transition-all h-28 flex flex-col justify-between",
                      item.gradient,
                      item.textColor || "text-foreground"
                    )}>
                    <p className="text-3xl mb-1">{item.emoji}</p>
                    <div>
                      <p className="text-sm font-bold leading-tight">{item.label}</p>
                      <p className={cn("text-[11px] mt-0.5 leading-tight", item.textColor ? "opacity-70" : "text-muted-foreground")}>{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Long-press sticker preview — Facebook Messenger style ── */}
      <AnimatePresence>
        {previewSticker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ backdropFilter: "blur(16px)", background: "rgba(0,0,0,0.4)" }}
            onClick={() => setPreviewSticker(null)}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Large sticker preview */}
              <div className="w-56 h-56 bg-card/90 rounded-3xl border border-border/40 shadow-2xl flex items-center justify-center p-6 mb-3">
                <div className="relative h-full w-full">
                  <LiveIllustratedStickerArt sticker={{ ...previewSticker, animatedSrc: getAnimatedStickerUrl(previewSticker.id) }} large />
                </div>
              </div>

              {/* Action buttons */}
              <div className="bg-card rounded-2xl border border-border/40 shadow-xl overflow-hidden min-w-[200px]">
                <button type="button"
                  onClick={() => {
                    sendSticker(`[sticker:${previewSticker.id}]`);
                    setPreviewSticker(null);
                  }}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border/20"
                >
                  <span className="text-[15px] font-medium text-foreground">Send</span>
                  <Send className="w-4 h-4 text-muted-foreground" />
                </button>
                <button type="button"
                  onClick={() => {
                    const key = "zivo_fav_stickers";
                    const isFav = favoriteStickers.includes(previewSticker.id);
                    const next = isFav
                      ? favoriteStickers.filter((id) => id !== previewSticker.id)
                      : [previewSticker.id, ...favoriteStickers].slice(0, 50);
                    setFavoriteStickers(next);
                    writeJsonArray(key, next);
                    toast.success(isFav ? "Removed from favorites" : "Added to favorites ⭐");
                    setPreviewSticker(null);
                  }}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors"
                >
                  <span className="text-[15px] font-medium text-foreground">Favorite</span>
                  <Heart className={`w-4 h-4 ${favoriteStickers.includes(previewSticker.id) ? "text-rose-500 fill-rose-500" : "text-muted-foreground"}`} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
