import { useCallback, useEffect, useState } from "react";

export type ChatStorageConnection = "wifi" | "cellular" | "roaming";
export type ChatStorageMediaKind = "photos" | "videos" | "files" | "audio";
export type ChatKeepMedia = "3d" | "1w" | "1m" | "forever";

export interface ChatStoragePrefs {
  version: 2;
  keepMedia: ChatKeepMedia;
  dataSaver: boolean;
  streamVideos: boolean;
  backgroundDownloads: boolean;
  saveEditedMedia: boolean;
  maxVideoMB: number;
  maxFileMB: number;
  autoDownload: Record<ChatStorageConnection, Record<ChatStorageMediaKind, boolean>>;
}

export const CHAT_STORAGE_PREFS_EVENT = "zivo:chat-storage-prefs-changed";

export const DEFAULT_CHAT_STORAGE_PREFS: ChatStoragePrefs = {
  version: 2,
  keepMedia: "1m",
  dataSaver: false,
  streamVideos: true,
  backgroundDownloads: true,
  saveEditedMedia: false,
  maxVideoMB: 30,
  maxFileMB: 25,
  autoDownload: {
    wifi: { photos: true, videos: true, files: true, audio: true },
    cellular: { photos: true, videos: false, files: false, audio: true },
    roaming: { photos: false, videos: false, files: false, audio: false },
  },
};

function storageKey(userId: string | undefined) {
  return `zivo:chat-storage:${userId || "anon"}`;
}

function legacyToPrefs(parsed: Partial<ChatStoragePrefs> & Record<string, unknown>): ChatStoragePrefs {
  return {
    ...DEFAULT_CHAT_STORAGE_PREFS,
    ...parsed,
    version: 2,
    autoDownload: {
      wifi: {
        ...DEFAULT_CHAT_STORAGE_PREFS.autoDownload.wifi,
        ...(parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.wifi,
        photos: typeof parsed.autoPhotosWifi === "boolean" ? parsed.autoPhotosWifi : (parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.wifi?.photos ?? DEFAULT_CHAT_STORAGE_PREFS.autoDownload.wifi.photos,
        videos: typeof parsed.autoVideosWifi === "boolean" ? parsed.autoVideosWifi : (parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.wifi?.videos ?? DEFAULT_CHAT_STORAGE_PREFS.autoDownload.wifi.videos,
        files: typeof parsed.autoFilesWifi === "boolean" ? parsed.autoFilesWifi : (parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.wifi?.files ?? DEFAULT_CHAT_STORAGE_PREFS.autoDownload.wifi.files,
      },
      cellular: {
        ...DEFAULT_CHAT_STORAGE_PREFS.autoDownload.cellular,
        ...(parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.cellular,
        photos: typeof parsed.autoPhotosCellular === "boolean" ? parsed.autoPhotosCellular : (parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.cellular?.photos ?? DEFAULT_CHAT_STORAGE_PREFS.autoDownload.cellular.photos,
        videos: typeof parsed.autoVideosCellular === "boolean" ? parsed.autoVideosCellular : (parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.cellular?.videos ?? DEFAULT_CHAT_STORAGE_PREFS.autoDownload.cellular.videos,
        files: typeof parsed.autoFilesCellular === "boolean" ? parsed.autoFilesCellular : (parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.cellular?.files ?? DEFAULT_CHAT_STORAGE_PREFS.autoDownload.cellular.files,
      },
      roaming: {
        ...DEFAULT_CHAT_STORAGE_PREFS.autoDownload.roaming,
        ...(parsed.autoDownload as ChatStoragePrefs["autoDownload"] | undefined)?.roaming,
      },
    },
    maxVideoMB: typeof parsed.maxVideoMB === "number" ? parsed.maxVideoMB : DEFAULT_CHAT_STORAGE_PREFS.maxVideoMB,
    maxFileMB: typeof parsed.maxFileMB === "number" ? parsed.maxFileMB : DEFAULT_CHAT_STORAGE_PREFS.maxFileMB,
  };
}

export function getChatStoragePrefs(userId: string | undefined): ChatStoragePrefs {
  if (typeof window === "undefined") return DEFAULT_CHAT_STORAGE_PREFS;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? legacyToPrefs(JSON.parse(raw)) : DEFAULT_CHAT_STORAGE_PREFS;
  } catch {
    return DEFAULT_CHAT_STORAGE_PREFS;
  }
}

export function saveChatStoragePrefs(userId: string | undefined, prefs: ChatStoragePrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent(CHAT_STORAGE_PREFS_EVENT, { detail: { userId, prefs } }));
  } catch {
    // Private mode or quota failures should not block chat.
  }
}

export function useChatStoragePrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<ChatStoragePrefs>(() => getChatStoragePrefs(userId));

  useEffect(() => {
    setPrefs(getChatStoragePrefs(userId));
  }, [userId]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey(userId)) setPrefs(getChatStoragePrefs(userId));
    };
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; prefs: ChatStoragePrefs }>).detail;
      if (detail?.userId === userId) setPrefs(detail.prefs);
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener(CHAT_STORAGE_PREFS_EVENT, handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CHAT_STORAGE_PREFS_EVENT, handleCustom);
    };
  }, [userId]);

  const updatePrefs = useCallback((next: ChatStoragePrefs | ((current: ChatStoragePrefs) => ChatStoragePrefs)) => {
    setPrefs((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      saveChatStoragePrefs(userId, resolved);
      return resolved;
    });
  }, [userId]);

  return { prefs, setPrefs: updatePrefs };
}

export function inferChatStorageConnection(): ChatStorageConnection {
  if (typeof navigator === "undefined") return "wifi";
  const connection = (navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string; saveData?: boolean };
  }).connection;
  if (connection?.type === "cellular" || connection?.effectiveType === "2g" || connection?.effectiveType === "3g") return "cellular";
  return "wifi";
}

export function shouldAutoDownloadChatMedia(args: {
  userId?: string;
  mediaKind: ChatStorageMediaKind;
  sizeBytes?: number | null;
  connection?: ChatStorageConnection;
}) {
  const prefs = getChatStoragePrefs(args.userId);
  const connection = args.connection ?? inferChatStorageConnection();
  if (!prefs.autoDownload[connection]?.[args.mediaKind]) return false;
  if (prefs.dataSaver && connection !== "wifi") return false;
  if (args.mediaKind === "videos" && args.sizeBytes && args.sizeBytes > prefs.maxVideoMB * 1024 * 1024) return false;
  if (args.mediaKind === "files" && args.sizeBytes && args.sizeBytes > prefs.maxFileMB * 1024 * 1024) return false;
  return true;
}
