export type ChatMediaCacheBucket = "photos" | "videos" | "files" | "audio" | "other";
export type ChatMediaCacheKind = "standard" | "locked-preview" | "locked-original";

export type ChatMediaCacheBucketStats = {
  bytes: number;
  entries: number;
  lockedPreviewBytes: number;
  lockedPreviewEntries: number;
  protectedBytes: number;
  protectedEntries: number;
};

export type ChatMediaCacheEntry = {
  id: string;
  url: string;
  bucket: ChatMediaCacheBucket;
  bytes: number;
  createdAt: number;
  lastAccessedAt: number;
  storagePath?: string | null;
  cacheKind?: ChatMediaCacheKind;
};

export type ChatMediaCacheStats = Record<ChatMediaCacheBucket, ChatMediaCacheBucketStats>;

export const CHAT_MEDIA_CACHE_EVENT = "zivo:chat-media-cache-changed";

const CHAT_MEDIA_CACHE_VERSION = 2;
const MAX_TRACKED_ENTRIES = 400;
const ANON_USER_ID = "anon";

const EMPTY_STATS: ChatMediaCacheStats = {
  photos: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
  videos: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
  files: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
  audio: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
  other: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
};

type ChatMediaCacheStore = {
  version: typeof CHAT_MEDIA_CACHE_VERSION;
  entries: ChatMediaCacheEntry[];
};

function storageKey(userId: string | undefined) {
  return `zivo:chat-media-cache:${userId || ANON_USER_ID}`;
}

function storageKeysFor(userId: string | undefined) {
  const primary = storageKey(userId);
  const anonymous = storageKey(undefined);
  return userId ? [primary, anonymous] : [anonymous];
}

function cloneEmptyStats(): ChatMediaCacheStats {
  return {
    photos: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
    videos: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
    files: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
    audio: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
    other: { bytes: 0, entries: 0, lockedPreviewBytes: 0, lockedPreviewEntries: 0, protectedBytes: 0, protectedEntries: 0 },
  };
}

function normalizeCacheKind(value: unknown): ChatMediaCacheKind {
  return value === "locked-preview" || value === "locked-original" ? value : "standard";
}

function normalizeBucket(value: unknown): ChatMediaCacheBucket {
  return typeof value === "string" && value in EMPTY_STATS ? value as ChatMediaCacheBucket : "other";
}

function readStoreByKey(key: string): ChatMediaCacheEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<ChatMediaCacheStore>;
    if (!Array.isArray(parsed.entries)) return [];
    return parsed.entries
      .filter((entry): entry is ChatMediaCacheEntry => (
        !!entry
        && typeof entry.id === "string"
        && typeof entry.url === "string"
        && typeof entry.createdAt === "number"
        && typeof entry.lastAccessedAt === "number"
      ))
      .map((entry) => ({
        ...entry,
        bucket: normalizeBucket(entry.bucket),
        bytes: typeof entry.bytes === "number" && Number.isFinite(entry.bytes) ? entry.bytes : 0,
        storagePath: entry.storagePath || null,
        cacheKind: normalizeCacheKind(entry.cacheKind),
      }));
  } catch {
    return [];
  }
}

function writeStoreByKey(key: string, entries: ChatMediaCacheEntry[]) {
  if (typeof window === "undefined") return;
  const sorted = [...entries]
    .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)
    .slice(0, MAX_TRACKED_ENTRIES);
  try {
    window.localStorage.setItem(key, JSON.stringify({
      version: CHAT_MEDIA_CACHE_VERSION,
      entries: sorted,
    } satisfies ChatMediaCacheStore));
  } catch {
    // Storage quota failures should not block rendering chat media.
  }
}

function dispatchCacheChanged(userId: string | undefined) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_MEDIA_CACHE_EVENT, { detail: { userId } }));
}

export function normalizeChatMediaCacheUrl(url: string) {
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  try {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const parsed = new URL(url, baseUrl);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return url.split("#")[0].split("?")[0];
  }
}

function idForEntry(url: string, storagePath?: string | null) {
  if (storagePath) return `path:${storagePath}`;
  return `url:${normalizeChatMediaCacheUrl(url)}`;
}

export function classifyChatMediaUrl(url: string, fallback?: ChatMediaCacheBucket): ChatMediaCacheBucket {
  const lower = url.toLowerCase();
  if (fallback) return fallback;
  if (/\.(png|jpe?g|webp|gif|avif|heic)(\?|#|$)/.test(lower) || lower.includes("image/")) return "photos";
  if (/\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/.test(lower) || lower.includes("video/")) return "videos";
  if (/\.(mp3|m4a|ogg|wav|aac|opus)(\?|#|$)/.test(lower) || lower.includes("audio/") || lower.includes("voice")) return "audio";
  if (/\.(pdf|docx?|xlsx?|pptx?|csv|txt|zip|rar)(\?|#|$)/.test(lower) || lower.includes("application/")) return "files";
  return "other";
}

function dataUrlBytes(url: string): number | null {
  if (!url.startsWith("data:")) return null;
  const comma = url.indexOf(",");
  if (comma === -1) return null;
  const payload = url.slice(comma + 1);
  if (url.slice(0, comma).includes(";base64")) {
    return Math.max(0, Math.floor((payload.length * 3) / 4));
  }
  try {
    return new Blob([decodeURIComponent(payload)]).size;
  } catch {
    return new Blob([payload]).size;
  }
}

export function estimateLoadedMediaBytes(url: string): number | null {
  const dataSize = dataUrlBytes(url);
  if (dataSize != null) return dataSize;
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return null;

  const withoutHash = url.split("#")[0];
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  for (let index = resources.length - 1; index >= 0; index -= 1) {
    const entry = resources[index];
    if (entry.name !== url && entry.name !== withoutHash) continue;
    const bytes = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize;
    if (typeof bytes === "number" && Number.isFinite(bytes) && bytes > 0) return Math.round(bytes);
  }
  return null;
}

export function recordChatMediaCacheEntry(args: {
  userId?: string;
  url: string | null | undefined;
  bucket?: ChatMediaCacheBucket;
  bytes?: number | null;
  storagePath?: string | null;
  cacheKind?: ChatMediaCacheKind;
}) {
  if (typeof window === "undefined" || !args.url) return;
  const now = Date.now();
  const key = storageKey(args.userId);
  const id = idForEntry(args.url, args.storagePath);
  const entries = readStoreByKey(key);
  const previous = entries.find((entry) => entry.id === id);
  const estimatedBytes = args.bytes ?? estimateLoadedMediaBytes(args.url) ?? previous?.bytes ?? 0;
  const safeBytes = typeof estimatedBytes === "number" && Number.isFinite(estimatedBytes) && estimatedBytes > 0
    ? Math.round(estimatedBytes)
    : 0;
  const nextEntry: ChatMediaCacheEntry = {
    id,
    url: args.url,
    bucket: classifyChatMediaUrl(args.url, args.bucket),
    bytes: safeBytes,
    createdAt: previous?.createdAt || now,
    lastAccessedAt: now,
    storagePath: args.storagePath || previous?.storagePath || null,
    cacheKind: normalizeCacheKind(args.cacheKind || previous?.cacheKind),
  };
  writeStoreByKey(key, [nextEntry, ...entries.filter((entry) => entry.id !== id)]);
  dispatchCacheChanged(args.userId);
}

export function getChatMediaCacheStats(userId: string | undefined): ChatMediaCacheStats {
  const stats = cloneEmptyStats();
  const seen = new Set<string>();
  for (const key of storageKeysFor(userId)) {
    for (const entry of readStoreByKey(key)) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      const bucket = entry.bucket in EMPTY_STATS ? entry.bucket : "other";
      const cacheKind = normalizeCacheKind(entry.cacheKind);
      stats[bucket].entries += 1;
      stats[bucket].bytes += Math.max(0, entry.bytes || 0);
      if (cacheKind === "locked-preview") {
        stats[bucket].lockedPreviewEntries += 1;
        stats[bucket].lockedPreviewBytes += Math.max(0, entry.bytes || 0);
      }
      if (cacheKind === "locked-original") {
        stats[bucket].protectedEntries += 1;
        stats[bucket].protectedBytes += Math.max(0, entry.bytes || 0);
      }
    }
  }
  return stats;
}

export function getProtectedChatMediaCacheUrls(userId: string | undefined): Set<string> {
  const urls = new Set<string>();
  const seen = new Set<string>();
  for (const key of storageKeysFor(userId)) {
    for (const entry of readStoreByKey(key)) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      if (normalizeCacheKind(entry.cacheKind) === "locked-original") {
        urls.add(normalizeChatMediaCacheUrl(entry.url));
      }
    }
  }
  return urls;
}

export async function clearChatMediaCache(
  userId: string | undefined,
  selected: Set<ChatMediaCacheBucket>,
  options: { includeLockedOriginals?: boolean; lockedPreviewsOnly?: boolean } = {},
) {
  let removed = 0;
  const removedUrls: string[] = [];
  for (const key of storageKeysFor(userId)) {
    const entries = readStoreByKey(key);
    const kept = entries.filter((entry) => {
      const cacheKind = normalizeCacheKind(entry.cacheKind);
      const shouldRemove = selected.has(entry.bucket)
        && (!options.lockedPreviewsOnly || cacheKind === "locked-preview")
        && (cacheKind !== "locked-original" || Boolean(options.includeLockedOriginals));
      if (shouldRemove) {
        removed += 1;
        removedUrls.push(entry.url);
      }
      return !shouldRemove;
    });
    writeStoreByKey(key, kept);
  }

  if ("caches" in window && removedUrls.length > 0) {
    try {
      const removedNormalizedUrls = new Set(removedUrls.map((url) => normalizeChatMediaCacheUrl(url)));
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(requests.map((request) => {
          const normalizedRequest = normalizeChatMediaCacheUrl(request.url);
          const matches = removedNormalizedUrls.has(normalizedRequest);
          return matches ? cache.delete(request) : Promise.resolve(false);
        }));
      }));
    } catch {
      // The metadata was still cleared; browsers may reject cache inspection.
    }
  }

  dispatchCacheChanged(userId);
  return removed;
}

export function pruneChatMediaCacheByKeepMedia(userId: string | undefined, keepMedia: "3d" | "1w" | "1m" | "forever") {
  if (keepMedia === "forever") return 0;
  const maxAgeMs = {
    "3d": 3 * 24 * 60 * 60 * 1000,
    "1w": 7 * 24 * 60 * 60 * 1000,
    "1m": 30 * 24 * 60 * 60 * 1000,
  }[keepMedia];
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;
  for (const key of storageKeysFor(userId)) {
    const entries = readStoreByKey(key);
    const kept = entries.filter((entry) => {
      if (normalizeCacheKind(entry.cacheKind) === "locked-original") return true;
      const isFresh = entry.lastAccessedAt >= cutoff;
      if (!isFresh) removed += 1;
      return isFresh;
    });
    if (kept.length !== entries.length) writeStoreByKey(key, kept);
  }
  if (removed > 0) dispatchCacheChanged(userId);
  return removed;
}
