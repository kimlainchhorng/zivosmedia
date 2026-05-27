import type { ChannelPost } from "@/hooks/useChannel";

export const CHANNEL_MEDIA_TABS = ["media", "files", "links", "music", "gif", "voice"] as const;

export type ChannelMediaTab = (typeof CHANNEL_MEDIA_TABS)[number];

export type ChannelMediaItem = {
  id: string;
  postId: string;
  tab: ChannelMediaTab;
  url: string;
  label: string;
  type: string;
  createdAt: string | null;
  durationMs?: number | null;
};

export type ChannelMediaBuckets = Record<ChannelMediaTab, ChannelMediaItem[]>;

const URL_PATTERN = /https?:\/\/[^\s<>"')]+/gi;

const AUDIO_HOSTS = [
  "spotify.com",
  "music.apple.com",
  "soundcloud.com",
  "audiomack.com",
  "bandcamp.com",
  "deezer.com",
  "tidal.com",
  "youtube.com",
  "youtu.be",
];

const createBuckets = (): ChannelMediaBuckets => ({
  media: [],
  files: [],
  links: [],
  music: [],
  gif: [],
  voice: [],
});

export function extractChannelPostUrls(body?: string | null): string[] {
  if (!body) return [];
  const matches = body.match(URL_PATTERN) || [];
  return [...new Set(matches.map((url) => url.replace(/[),.;!?]+$/g, "")))];
}

export function formatChannelMediaDuration(durationMs?: number | null): string | null {
  if (!durationMs || !Number.isFinite(durationMs)) return null;
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function buildChannelMediaBuckets(posts: ChannelPost[]): ChannelMediaBuckets {
  const buckets = createBuckets();

  posts.forEach((post) => {
    const createdAt = post.published_at || post.created_at || null;

    readMediaItems(post).forEach((rawItem, index) => {
      const url = getItemUrl(rawItem);
      if (!url) return;

      const type = getItemType(rawItem);
      const tab = classifyMediaItem(rawItem, url);
      const label = getItemLabel(rawItem, url);

      buckets[tab].push({
        id: `${post.id}-${tab}-${index}`,
        postId: post.id,
        tab,
        url,
        label,
        type,
        createdAt,
        durationMs: getItemDuration(rawItem),
      });
    });

    extractChannelPostUrls(post.body).forEach((url, index) => {
      const linkItem: ChannelMediaItem = {
        id: `${post.id}-link-${index}`,
        postId: post.id,
        tab: "links",
        url,
        label: getUrlLabel(url),
        type: "link",
        createdAt,
      };
      buckets.links.push(linkItem);

      if (isMusicUrl(url)) {
        buckets.music.push({
          ...linkItem,
          id: `${post.id}-music-link-${index}`,
          tab: "music",
          type: "music-link",
        });
      }
    });
  });

  return buckets;
}

export function channelPostMatchesTab(post: ChannelPost, tab: ChannelMediaTab): boolean {
  return buildChannelMediaBuckets([post])[tab].length > 0;
}

function readMediaItems(post: ChannelPost): any[] {
  if (!Array.isArray(post.media)) return [];
  return post.media.filter(Boolean);
}

function getItemUrl(item: any): string | null {
  const url = item?.url || item?.src || item?.preview_url || item?.previewUrl;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function getItemType(item: any): string {
  return String(item?.type || item?.mime_type || item?.mimeType || "").toLowerCase();
}

function getItemLabel(item: any, url: string): string {
  const label = item?.name || item?.filename || item?.file_name || item?.title || item?.caption;
  if (typeof label === "string" && label.trim()) return label.trim();
  return getUrlLabel(url);
}

function getItemDuration(item: any): number | null {
  const duration = item?.duration_ms ?? item?.durationMs ?? item?.duration;
  if (typeof duration !== "number" || !Number.isFinite(duration)) return null;
  return duration > 1000 ? duration : duration * 1000;
}

function classifyMediaItem(item: any, url: string): ChannelMediaTab {
  const type = getItemType(item);

  if (isVoiceItem(type, item)) return "voice";
  if (isGifItem(type, url)) return "gif";
  if (isMusicItem(type, url)) return "music";
  if (isFileItem(type, item, url)) return "files";
  return "media";
}

function isVoiceItem(type: string, item: any): boolean {
  return type === "voice" || type.includes("voice") || item?.kind === "voice" || item?.voice === true;
}

function isGifItem(type: string, url: string): boolean {
  return type === "gif" || type.includes("image/gif") || /\.gif($|\?)/i.test(url);
}

function isMusicItem(type: string, url: string): boolean {
  if (type === "music" || type.startsWith("audio/") || type.includes("audio")) return true;
  return isMusicUrl(url);
}

function isFileItem(type: string, item: any, url: string): boolean {
  if (type === "file" || type === "document" || type.includes("application/")) return true;
  if (item?.filename || item?.file_name) return !isImageVideoUrl(url) && !isMusicItem(type, url);
  return /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|csv|txt)($|\?)/i.test(url);
}

function isImageVideoUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|avif|gif|mp4|mov|m4v|webm)($|\?)/i.test(url);
}

function isMusicUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return AUDIO_HOSTS.some((knownHost) => host === knownHost || host.endsWith(`.${knownHost}`));
  } catch {
    return /\.(mp3|m4a|aac|wav|ogg|flac)($|\?)/i.test(url);
  }
}

function getUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    return path || parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
