/**
 * Single source of truth for the bundled "Zivo Sessions" music catalog.
 * Used by:
 *   - StickerKeyboard.tsx — picker that sends a music card in chat
 *   - ChatMessageBubble.tsx — inline play button on the received card
 *   - SoundPage.tsx — full sound page (reels-with-this-sound)
 * Adding a track here propagates to all three.
 */

export interface ZivoTrack {
  slug: string;
  title: string;
  artist: string;
  duration: string;
  previewUrl: string;
  shareUrl: string;
  genre: string;
  coverGradient: string;
}

export const ZIVO_SESSIONS: ZivoTrack[] = [
  { slug: "midnight-drive", title: "Midnight Drive", artist: "Zivo Sessions", duration: "3:20", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", shareUrl: "https://hizovo.com/sound/midnight-drive", genre: "Chill",     coverGradient: "from-violet-600 to-indigo-800" },
  { slug: "city-lights",    title: "City Lights",    artist: "Zivo Sessions", duration: "3:23", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", shareUrl: "https://hizovo.com/sound/city-lights",    genre: "Lo-fi",     coverGradient: "from-amber-500 to-orange-700" },
  { slug: "ocean-ride",     title: "Ocean Ride",     artist: "Zivo Sessions", duration: "2:21", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", shareUrl: "https://hizovo.com/sound/ocean-ride",     genre: "Ambient",   coverGradient: "from-cyan-500 to-blue-700" },
  { slug: "sunset-loop",    title: "Sunset Loop",    artist: "Zivo Sessions", duration: "2:47", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", shareUrl: "https://hizovo.com/sound/sunset-loop",    genre: "Beats",     coverGradient: "from-rose-500 to-pink-700" },
  { slug: "neon-streets",   title: "Neon Streets",   artist: "Zivo Sessions", duration: "4:01", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", shareUrl: "https://hizovo.com/sound/neon-streets",   genre: "Synth",     coverGradient: "from-emerald-500 to-teal-800" },
  { slug: "golden-hour",    title: "Golden Hour",    artist: "Zivo Sessions", duration: "3:45", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", shareUrl: "https://hizovo.com/sound/golden-hour",    genre: "Pop",       coverGradient: "from-yellow-500 to-amber-700" },
  { slug: "night-runner",   title: "Night Runner",   artist: "Zivo Sessions", duration: "3:55", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3", shareUrl: "https://hizovo.com/sound/night-runner",   genre: "Electronic", coverGradient: "from-purple-600 to-fuchsia-800" },
  { slug: "coastal-breeze", title: "Coastal Breeze", artist: "Zivo Sessions", duration: "2:38", previewUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", shareUrl: "https://hizovo.com/sound/coastal-breeze", genre: "Tropical",  coverGradient: "from-teal-400 to-sky-600" },
];

const BY_SLUG = new Map(ZIVO_SESSIONS.map((t) => [t.slug, t]));

export function findZivoTrackBySlug(slug: string): ZivoTrack | undefined {
  return BY_SLUG.get(slug);
}

export function findZivoTrackByTitle(title: string): ZivoTrack | undefined {
  const normalized = title.trim().toLowerCase();
  return ZIVO_SESSIONS.find((t) => t.title.toLowerCase() === normalized);
}
