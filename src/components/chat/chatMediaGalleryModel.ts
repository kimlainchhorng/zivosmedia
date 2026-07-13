import { getLockedMediaItems, getLockedMediaPreviewPath, isLockedMediaMessage } from "@/lib/chat/lockedMedia";
import { validateExternalUrl } from "@/lib/urlSafety";
import type { ChatMediaCacheBucket, ChatMediaCacheKind } from "@/lib/chat/mediaCache";
import { parseLegacyMusicShare } from "./musicShare";

export type ChatMediaGalleryTab = "photos" | "videos" | "gif" | "voice" | "music" | "files" | "links";

export type ChatMediaGalleryFilePayload = {
  url?: string | null;
  filename?: string | null;
  name?: string | null;
  fileName?: string | null;
  title?: string | null;
  mime_type?: string | null;
  duration_ms?: number | string | null;
  durationMs?: number | string | null;
  size?: number | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  locked_preview_url?: string | null;
  locked_preview_image_url?: string | null;
  locked_items?: unknown;
  album_items?: unknown;
  media_items?: unknown;
  items?: unknown;
  media_album?: ChatMediaGalleryFilePayload | null;
  [key: string]: unknown;
};

export type ChatMediaGalleryMessage = {
  id: string;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  message_type?: string | null;
  message?: string | null;
  file_payload?: ChatMediaGalleryFilePayload | null;
  created_at: string;
  sender_id: string;
};

export type ChatMediaGalleryItem = {
  id: string;
  messageId: string;
  kind: ChatMediaGalleryTab;
  url: string;
  title: string;
  senderId: string;
  senderLabel: string;
  createdAt: string;
  mimeType?: string | null;
  durationMs?: number | null;
  size?: number | null;
  cacheBucket: ChatMediaCacheBucket;
  cacheKind: ChatMediaCacheKind;
  locked: boolean;
};

export type NormalizeChatMediaOptions = {
  currentUserId?: string | null;
  peerName?: string;
  senderLabelFor?: (senderId: string) => string;
  isMessageUnlocked?: (messageId: string) => boolean;
};

export const CHAT_MEDIA_GALLERY_TABS: ChatMediaGalleryTab[] = ["photos", "videos", "gif", "music", "voice", "files", "links"];

const URL_RE = /https?:\/\/[^\s<>"')]+/gi;

function firstUrl(value?: string | null) {
  return value?.match(URL_RE)?.[0] || "";
}

function urlsIn(value?: string | null) {
  return value?.match(URL_RE) || [];
}

function isGifUrl(value?: string | null) {
  return Boolean(value && /\.gif(?:[?#]|$)/i.test(value));
}

function isVideoUrl(value?: string | null) {
  return Boolean(value && /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(value));
}

function parseGifShare(message?: string | null): { label: string; url: string } | null {
  const match = message?.trim().match(/^\[gif\]\s*([^:]+):\s*(https?:\/\/\S+)$/i);
  if (!match) return null;
  return { label: match[1].trim() || "GIF", url: match[2].trim() };
}

function isMusicLink(value?: string | null) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host.includes("spotify.com") || host.includes("music.apple.com") || host.includes("soundcloud.com") || host.includes("youtu");
  } catch {
    return Boolean(value?.includes("/sound/"));
  }
}

function cacheBucketFor(kind: ChatMediaGalleryTab): ChatMediaCacheBucket {
  if (kind === "photos" || kind === "gif") return "photos";
  if (kind === "videos") return "videos";
  if (kind === "voice" || kind === "music") return "audio";
  if (kind === "files") return "files";
  return "other";
}

function labelFor(msg: ChatMediaGalleryMessage, options: NormalizeChatMediaOptions) {
  if (options.senderLabelFor) return options.senderLabelFor(msg.sender_id);
  if (msg.sender_id === options.currentUserId) return "You";
  return options.peerName || "Sender";
}

function fileTitle(payload: ChatMediaGalleryFilePayload | null | undefined, fallback?: string | null) {
  return payload?.filename || payload?.name || payload?.fileName || payload?.title || fallback || "Attachment";
}

function kindForFile(url: string, mimeType: string, messageType?: string | null): ChatMediaGalleryTab {
  if (messageType === "gif" || mimeType === "image/gif" || isGifUrl(url)) return "gif";
  if (messageType === "music" || messageType === "audio" || mimeType.startsWith("audio/") || isMusicLink(url)) return "music";
  if (mimeType.startsWith("image/")) return "photos";
  if (mimeType.startsWith("video/")) return "videos";
  return "files";
}

function mediaItem(args: {
  message: ChatMediaGalleryMessage;
  options: NormalizeChatMediaOptions;
  suffix: string;
  kind: ChatMediaGalleryTab;
  url: string | null | undefined;
  title?: string | null;
  mimeType?: string | null;
  durationMs?: number | null;
  size?: number | null;
  locked?: boolean;
  cacheKind?: ChatMediaCacheKind;
}): ChatMediaGalleryItem | null {
  if (!args.url) return null;
  return {
    id: `${args.message.id}-${args.suffix}`,
    messageId: args.message.id,
    kind: args.kind,
    url: args.url,
    title: args.title || defaultTitle(args.kind),
    senderId: args.message.sender_id,
    senderLabel: labelFor(args.message, args.options),
    createdAt: args.message.created_at,
    mimeType: args.mimeType || null,
    durationMs: args.durationMs ?? null,
    size: args.size ?? null,
    cacheBucket: cacheBucketFor(args.kind),
    cacheKind: args.cacheKind || "standard",
    locked: Boolean(args.locked),
  };
}

function defaultTitle(kind: ChatMediaGalleryTab) {
  if (kind === "photos") return "Photo";
  if (kind === "videos") return "Video";
  if (kind === "gif") return "GIF";
  if (kind === "voice") return "Voice message";
  if (kind === "music") return "Music";
  if (kind === "links") return "Link";
  return "File";
}

function normalizeAlbumItems(message: ChatMediaGalleryMessage, options: NormalizeChatMediaOptions) {
  const payload = message.file_payload?.media_album || message.file_payload || null;
  const raw = Array.isArray(payload?.album_items)
    ? payload.album_items
    : Array.isArray(payload?.media_items)
    ? payload.media_items
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const url =
        stringValue(item.url) ||
        stringValue(item.media_url) ||
        stringValue(item.path) ||
        stringValue(item.original_path) ||
        stringValue(item.preview_url) ||
        stringValue(item.thumbnail_url) ||
        stringValue(item.thumbnailUrl);
      const mimeType = stringValue(item.mime_type).toLowerCase();
      const rawKind = (stringValue(item.type) || stringValue(item.kind)).toLowerCase();
      const kind: ChatMediaGalleryTab = mimeType === "image/gif" || rawKind === "gif" || isGifUrl(url)
        ? "gif"
        : rawKind.includes("video") || mimeType.startsWith("video/") || isVideoUrl(url)
          ? "videos"
          : "photos";
      return mediaItem({
        message,
        options,
        suffix: `album-${index}`,
        kind,
        url,
        title: stringValue(item.filename) || stringValue(item.file_name) || stringValue(item.name) || defaultTitle(kind),
        mimeType,
        durationMs: durationMsValue(item.duration_ms ?? item.durationMs, item.duration_seconds ?? item.durationSeconds ?? item.duration),
        size: numberValue(item.size),
      });
    })
    .filter((item): item is ChatMediaGalleryItem => Boolean(item));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function durationMsValue(value: unknown, fallbackSeconds?: unknown) {
  const ms = typeof value === "string" ? Number(value) : value;
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) return Math.round(ms);
  const seconds = typeof fallbackSeconds === "string" ? Number(fallbackSeconds) : fallbackSeconds;
  if (typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0) return Math.round(seconds * 1000);
  return null;
}

function normalizeLockedMedia(message: ChatMediaGalleryMessage, options: NormalizeChatMediaOptions) {
  const unlocked = message.sender_id === options.currentUserId || Boolean(options.isMessageUnlocked?.(message.id));
  const cacheKind: ChatMediaCacheKind = unlocked ? "locked-original" : "locked-preview";
  const items = getLockedMediaItems(message.file_payload || null);

  if (items.length > 0) {
    return items
      .map((item, index) => {
        const url = unlocked ? item.original_path || item.preview_path : item.preview_path || getLockedMediaPreviewPath(message.file_payload || null);
        const kind: ChatMediaGalleryTab = item.kind === "video" ? "videos" : "photos";
        return mediaItem({
          message,
          options,
          suffix: `locked-${index}`,
          kind,
          url,
          title: unlocked ? defaultTitle(kind) : "Locked preview",
          mimeType: item.mime_type,
          size: item.size,
          locked: !unlocked,
          cacheKind,
        });
      })
      .filter((item): item is ChatMediaGalleryItem => Boolean(item));
  }

  const previewUrl = unlocked
    ? message.image_url || message.video_url || getLockedMediaPreviewPath(message.file_payload || null)
    : getLockedMediaPreviewPath(message.file_payload || null);
  const kind: ChatMediaGalleryTab = message.message_type === "locked_video" || Boolean(message.video_url && !message.image_url) ? "videos" : "photos";
  const item = mediaItem({
    message,
    options,
    suffix: "locked",
    kind,
    url: previewUrl,
    title: unlocked ? defaultTitle(kind) : "Locked preview",
    locked: !unlocked,
    cacheKind,
  });
  return item ? [item] : [];
}

export function normalizeChatMediaMessages(
  messages: ChatMediaGalleryMessage[],
  options: NormalizeChatMediaOptions = {},
): ChatMediaGalleryItem[] {
  const media: ChatMediaGalleryItem[] = [];

  for (const message of messages) {
    const payload = message.file_payload || null;
    const messageType = message.message_type || "text";
    const mimeType = payload?.mime_type?.toLowerCase() || "";
    const durationMs = durationMsValue(payload?.duration_ms ?? payload?.durationMs);
    const messageUrl = firstUrl(message.message);

    if (isLockedMediaMessage(messageType)) {
      media.push(...normalizeLockedMedia(message, options));
      continue;
    }

    const albumItems = normalizeAlbumItems(message, options);
    media.push(...albumItems);
    const hasAlbumItems = albumItems.length > 0;

    if (!hasAlbumItems && message.image_url) {
      media.push(mediaItem({
        message,
        options,
        suffix: "image",
        url: message.image_url,
        kind: messageType === "gif" || isGifUrl(message.image_url) ? "gif" : "photos",
        title: message.message || undefined,
        mimeType,
        durationMs,
      })!);
    }

    if (!hasAlbumItems && message.video_url) {
      media.push(mediaItem({
        message,
        options,
        suffix: "video",
        url: message.video_url,
        kind: messageType === "gif" || isGifUrl(message.video_url) ? "gif" : "videos",
        title: message.message || undefined,
        mimeType,
        durationMs,
      })!);
    }

    const gifShare = parseGifShare(message.message);
    if (gifShare && !message.image_url && !message.video_url) {
      media.push(mediaItem({ message, options, suffix: "gif", kind: "gif", url: gifShare.url, title: gifShare.label })!);
    }

    if (message.voice_url) {
      media.push(mediaItem({
        message,
        options,
        suffix: "voice",
        kind: "voice",
        url: message.voice_url,
        title: message.message || "Voice message",
        mimeType,
        durationMs,
      })!);
    }

    if (payload?.url) {
      const kind = kindForFile(payload.url, mimeType, messageType);
      media.push(mediaItem({
        message,
        options,
        suffix: "file",
        kind,
        url: payload.url,
        title: fileTitle(payload, message.message),
        mimeType,
        durationMs,
        size: payload.size,
      })!);
    }

    const musicShare = parseLegacyMusicShare(message.message);
    if (musicShare && !payload?.url) {
      media.push(mediaItem({
        message,
        options,
        suffix: "music",
        kind: "music",
        url: musicShare.previewUrl || messageUrl || musicShare.soundPath,
        title: [musicShare.title, musicShare.artist].filter(Boolean).join(" - ") || "Music",
      })!);
    } else if (!payload?.url && (messageType === "music" || isMusicLink(messageUrl))) {
      media.push(mediaItem({
        message,
        options,
        suffix: "music-link",
        kind: "music",
        url: messageUrl,
        title: message.message || "Music",
      })!);
    }

    if (message.message && messageType === "text" && !gifShare && !musicShare) {
      for (const [index, rawUrl] of urlsIn(message.message).entries()) {
        const safeUrl = validateExternalUrl(rawUrl);
        if (!safeUrl) continue;
        media.push(mediaItem({
          message,
          options,
          suffix: `link-${index}`,
          kind: "links",
          url: safeUrl,
          title: safeUrl.replace(/^https?:\/\//i, ""),
        })!);
      }
    }
  }

  return media.filter(Boolean);
}
