export const GROUP_LOCKED_MEDIA_STAR_PRESETS = [49, 99, 249, 499, 999] as const;

export type LockedMediaMessageLike = {
  id?: string;
  image_url?: string | null;
  video_url?: string | null;
  message_type?: string | null;
  file_payload?: {
    locked_preview_url?: string | null;
    locked_preview_image_url?: string | null;
    [key: string]: unknown;
  } | null;
};

export function formatStarsPrice(coins: number | null | undefined): string {
  const safeCoins = Number.isFinite(Number(coins)) ? Math.max(0, Math.floor(Number(coins))) : 0;
  return `\u2b50${safeCoins.toLocaleString()}`;
}

export function isLockedMediaMessage(messageType: string | null | undefined): boolean {
  return messageType === "locked_image" || messageType === "locked_video";
}

export function getLockedMediaPreviewPath(filePayload: LockedMediaMessageLike["file_payload"]): string | null {
  if (!filePayload) return null;
  const preview = filePayload.locked_preview_url || filePayload.locked_preview_image_url;
  return typeof preview === "string" && preview.length > 0 ? preview : null;
}

export function getGroupMediaGalleryPath(
  message: LockedMediaMessageLike,
  canViewOriginal: boolean,
): string | null {
  if (isLockedMediaMessage(message.message_type) && !canViewOriginal) {
    return getLockedMediaPreviewPath(message.file_payload);
  }
  return message.image_url || message.video_url || getLockedMediaPreviewPath(message.file_payload);
}
