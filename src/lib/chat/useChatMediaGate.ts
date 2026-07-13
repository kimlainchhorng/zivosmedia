/**
 * useChatMediaGate — bridges the Data & Storage auto-download preferences into
 * the chat media surfaces. Given a media kind + size it decides whether the
 * attachment may auto-load now, or whether the user must tap to download
 * (because auto-download is off for the current connection, data saver is on,
 * or the file exceeds the configured size limit). Once loaded it stays loaded.
 *
 * On the default Wi-Fi profile every kind auto-downloads, so this is a no-op
 * for the common case — it only gates when a preference actively blocks.
 */
import { useCallback, useMemo, useState } from "react";
import {
  getChatStoragePrefs,
  shouldAutoDownloadChatMedia,
  type ChatStorageMediaKind,
} from "@/hooks/useChatStoragePrefs";

export interface ChatMediaGate {
  /** True when the attachment bytes may be fetched/rendered now. */
  shouldLoad: boolean;
  /** True when the user must tap to download (auto-download blocked). */
  blocked: boolean;
  /** Mark this attachment as manually loaded (after a tap). */
  load: () => void;
  /** `preload` value for <video>, honoring "Stream videos first". */
  videoPreload: "metadata" | "auto";
}

export function useChatMediaGate(args: {
  userId?: string;
  kind: ChatStorageMediaKind;
  sizeBytes?: number | null;
  /** Bypass gating entirely (e.g. media already opened in a viewer). */
  bypass?: boolean;
}): ChatMediaGate {
  const { userId, kind, sizeBytes, bypass } = args;
  const [manual, setManual] = useState(false);

  const auto = useMemo(
    () => shouldAutoDownloadChatMedia({ userId, mediaKind: kind, sizeBytes: sizeBytes ?? undefined }),
    [userId, kind, sizeBytes],
  );

  const streamVideos = useMemo(() => getChatStoragePrefs(userId).streamVideos, [userId]);

  const shouldLoad = Boolean(bypass) || manual || auto;
  const load = useCallback(() => setManual(true), []);

  return {
    shouldLoad,
    blocked: !shouldLoad,
    load,
    videoPreload: streamVideos ? "metadata" : "auto",
  };
}
