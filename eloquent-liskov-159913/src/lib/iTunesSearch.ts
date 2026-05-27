/**
 * iTunes Search & Top Charts API client.
 *
 * Apple exposes two free, no-auth, CORS-enabled endpoints:
 *   - Search:     https://itunes.apple.com/search
 *   - Top charts: https://rss.applemarketingtools.com/api/v2/{country}/music/most-played/{limit}/songs.json
 *
 * Both return real, licensed metadata for global music (Cambodia, US, Thailand,
 * Vietnam, Japan, Korea, etc.) plus a 30-second preview MP3/M4A URL we can
 * legally play inline. No API key needed.
 *
 * We normalize the responses into a `ZivoTrack`-compatible shape so the
 * existing music-card UI in StickerKeyboard / ChatMessageBubble can render
 * iTunes results without branching on source.
 */

import type { ZivoTrack } from "./zivoSessions";

export type CountryCode =
  | "KH" | "US" | "TH" | "VN" | "JP" | "KR" | "CN" | "TW" | "HK"
  | "SG" | "MY" | "ID" | "PH" | "IN" | "GB" | "FR" | "DE" | "BR";

export const COUNTRIES: { code: CountryCode; label: string; flag: string }[] = [
  { code: "KH", label: "Cambodia",   flag: "🇰🇭" },
  { code: "US", label: "USA",        flag: "🇺🇸" },
  { code: "TH", label: "Thailand",   flag: "🇹🇭" },
  { code: "VN", label: "Vietnam",    flag: "🇻🇳" },
  { code: "KR", label: "Korea",      flag: "🇰🇷" },
  { code: "JP", label: "Japan",      flag: "🇯🇵" },
  { code: "CN", label: "China",      flag: "🇨🇳" },
  { code: "TW", label: "Taiwan",     flag: "🇹🇼" },
  { code: "HK", label: "Hong Kong",  flag: "🇭🇰" },
  { code: "SG", label: "Singapore",  flag: "🇸🇬" },
  { code: "MY", label: "Malaysia",   flag: "🇲🇾" },
  { code: "ID", label: "Indonesia",  flag: "🇮🇩" },
  { code: "PH", label: "Philippines", flag: "🇵🇭" },
  { code: "IN", label: "India",      flag: "🇮🇳" },
  { code: "GB", label: "UK",         flag: "🇬🇧" },
  { code: "FR", label: "France",     flag: "🇫🇷" },
  { code: "DE", label: "Germany",    flag: "🇩🇪" },
  { code: "BR", label: "Brazil",     flag: "🇧🇷" },
];

interface ITunesSearchResult {
  trackId: number;
  trackName: string;
  artistName: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
}

interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesSearchResult[];
}

interface ChartFeedSong {
  id: string;
  name: string;
  artistName: string;
  artworkUrl100?: string;
  url?: string;
  genres?: { genreId: string; name: string }[];
}

interface ChartFeedResponse {
  feed: { results: ChartFeedSong[] };
}

const formatDuration = (ms?: number): string => {
  if (!ms || ms <= 0) return "0:30";
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const upscaleArtwork = (url?: string): string => {
  if (!url) return "";
  return url.replace(/\/\d+x\d+([a-z]*)\.(jpg|png)$/, "/600x600bb.$2");
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const COVER_GRADIENTS = [
  "from-violet-600 to-indigo-800",
  "from-amber-500 to-orange-700",
  "from-cyan-500 to-blue-700",
  "from-rose-500 to-pink-700",
  "from-emerald-500 to-teal-800",
  "from-yellow-500 to-amber-700",
  "from-purple-600 to-fuchsia-800",
  "from-teal-400 to-sky-600",
];

function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
}

export interface RemoteTrack extends ZivoTrack {
  source: "itunes";
  artworkUrl: string;
}

/** Search the iTunes catalog. Returns up to `limit` songs. */
export async function searchITunes(
  query: string,
  country: CountryCode = "KH",
  limit = 25,
): Promise<RemoteTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", trimmed);
  url.searchParams.set("entity", "song");
  url.searchParams.set("country", country);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("media", "music");

  const resp = await fetch(url.toString());
  if (!resp.ok) throw new Error(`iTunes search failed: ${resp.status}`);
  const data = (await resp.json()) as ITunesSearchResponse;

  return data.results
    .filter((r) => r.previewUrl)
    .map((r) => ({
      source: "itunes" as const,
      slug: `itunes-${r.trackId}`,
      title: r.trackName,
      artist: r.artistName,
      duration: formatDuration(r.trackTimeMillis),
      previewUrl: r.previewUrl!,
      shareUrl: r.trackViewUrl || "",
      genre: r.primaryGenreName || "Music",
      coverGradient: pickGradient(r.artistName + r.trackName),
      artworkUrl: upscaleArtwork(r.artworkUrl100),
    }));
}

// Apple Music chart RSS only exists for ~30 storefronts. For markets without
// one (Cambodia, Vietnam, etc.) we fall back to a curated keyword-based search
// so users still get real, locally-relevant tracks.
const CHART_RSS_COUNTRIES: Set<CountryCode> = new Set([
  "US", "GB", "JP", "KR", "CN", "TW", "HK", "SG", "MY", "ID", "PH", "IN",
  "TH", "FR", "DE", "BR",
]);

const FALLBACK_KEYWORDS: Partial<Record<CountryCode, string[]>> = {
  KH: ["preap sovath", "sokun nisa", "khem", "aok sokunkanha", "khmer pop", "cambodia"],
  VN: ["sơn tùng m-tp", "đen vâu", "min", "vpop"],
};

const DEFAULT_KEYWORDS = ["pop", "hits", "top", "love", "dance"];

/** Fetch the top "most-played" songs in the given country. */
export async function topChartsITunes(
  country: CountryCode = "KH",
  limit = 25,
): Promise<RemoteTrack[]> {
  // Markets with a real Apple Music chart RSS feed.
  if (CHART_RSS_COUNTRIES.has(country)) {
    try {
      const url = `https://rss.applemarketingtools.com/api/v2/${country.toLowerCase()}/music/most-played/${limit}/songs.json`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`iTunes charts failed: ${resp.status}`);
      const data = (await resp.json()) as ChartFeedResponse;

      // The chart feed lacks previewUrl + duration — enrich with a search by
      // "title artist" to recover them.
      const enriched = await Promise.all(
        data.feed.results.slice(0, limit).map(async (song) => {
          try {
            const lookup = await searchITunes(`${song.name} ${song.artistName}`, country, 3);
            const match = lookup.find((r) => r.title.toLowerCase() === song.name.toLowerCase()) || lookup[0];
            if (match) return { ...match, slug: `itunes-${slugify(song.name + "-" + song.artistName)}` };
          } catch { /* swallow per-song failures so the chart still loads */ }
          return null;
        }),
      );
      const filled = enriched.filter((t): t is RemoteTrack => !!t);
      if (filled.length > 0) return filled;
      // Fall through to keyword fallback if the RSS returned nothing useful.
    } catch {
      // Fall through to keyword fallback on RSS failure.
    }
  }

  // Keyword fallback — use multiple targeted searches and dedupe by track id.
  const keywords = FALLBACK_KEYWORDS[country] ?? DEFAULT_KEYWORDS;
  const perKeyword = Math.max(3, Math.ceil(limit / keywords.length) + 1);
  const batches = await Promise.all(
    keywords.map((kw) =>
      searchITunes(kw, country, perKeyword).catch(() => [] as RemoteTrack[]),
    ),
  );
  const seen = new Set<string>();
  const merged: RemoteTrack[] = [];
  for (const batch of batches) {
    for (const t of batch) {
      if (seen.has(t.slug)) continue;
      seen.add(t.slug);
      merged.push(t);
      if (merged.length >= limit) return merged;
    }
  }
  return merged;
}
