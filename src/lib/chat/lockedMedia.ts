export const GROUP_LOCKED_MEDIA_STAR_PRESETS = [49, 99, 249, 444, 499, 999, 1999] as const;

export type LockedMediaItem = {
  id?: string | null;
  kind?: "image" | "video" | string | null;
  original_path?: string | null;
  preview_path?: string | null;
  mime_type?: string | null;
  size?: number | null;
};

export type LockedMediaMessageLike = {
  id?: string;
  image_url?: string | null;
  video_url?: string | null;
  message_type?: string | null;
  file_payload?: {
    locked_preview_url?: string | null;
    locked_preview_image_url?: string | null;
    locked_items?: unknown;
    [key: string]: unknown;
  } | null;
};

export function formatStarsPrice(coins: number | null | undefined): string {
  const safeCoins = Number.isFinite(Number(coins)) ? Math.max(0, Math.floor(Number(coins))) : 0;
  return `\u2b50${safeCoins.toLocaleString()}`;
}

export function isLockedMediaMessage(messageType: string | null | undefined): boolean {
  return messageType === "locked_image" || messageType === "locked_video" || messageType === "locked_album";
}

export function getLockedMediaItems(filePayload: LockedMediaMessageLike["file_payload"]): LockedMediaItem[] {
  const rawItems = filePayload?.locked_items;
  if (!Array.isArray(rawItems)) return [];

  return rawItems
    .map((item): LockedMediaItem | null => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as LockedMediaItem;
      const kind = candidate.kind === "video" ? "video" : "image";
      const originalPath = typeof candidate.original_path === "string" && candidate.original_path.length > 0
        ? candidate.original_path
        : null;
      const previewPath = typeof candidate.preview_path === "string" && candidate.preview_path.length > 0
        ? candidate.preview_path
        : null;
      if (!originalPath && !previewPath) return null;

      return {
        id: typeof candidate.id === "string" ? candidate.id : undefined,
        kind,
        original_path: originalPath,
        preview_path: previewPath,
        mime_type: typeof candidate.mime_type === "string" ? candidate.mime_type : null,
        size: typeof candidate.size === "number" ? candidate.size : null,
      };
    })
    .filter((item): item is LockedMediaItem => !!item);
}

export function getLockedMediaPreviewPath(filePayload: LockedMediaMessageLike["file_payload"]): string | null {
  if (!filePayload) return null;
  const preview = filePayload.locked_preview_url || filePayload.locked_preview_image_url;
  if (typeof preview === "string" && preview.length > 0) return preview;
  return getLockedMediaItems(filePayload)[0]?.preview_path || null;
}

export function getLockedAlbumPreviewPaths(filePayload: LockedMediaMessageLike["file_payload"]): string[] {
  return getLockedMediaItems(filePayload)
    .map((item) => item.preview_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

export function getLockedAlbumOriginalPaths(filePayload: LockedMediaMessageLike["file_payload"]): string[] {
  return getLockedMediaItems(filePayload)
    .map((item) => item.original_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

export function getGroupMediaGalleryPath(
  message: LockedMediaMessageLike,
  canViewOriginal: boolean,
): string | null {
  if (isLockedMediaMessage(message.message_type) && !canViewOriginal) {
    return getLockedMediaPreviewPath(message.file_payload);
  }
  return message.image_url
    || message.video_url
    || getLockedAlbumOriginalPaths(message.file_payload)[0]
    || getLockedMediaPreviewPath(message.file_payload);
}
