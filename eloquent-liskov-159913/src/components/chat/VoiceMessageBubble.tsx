/**
 * VoiceMessageBubble — wraps VoiceMessagePlayer with iMessage-style long-press
 * menu (reaction bar + Reply / Copy link / Forward / Pin / Resend / Delete).
 * Replaces the old bottom-drawer action sheet.
 */
import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import VoiceBubbleLongPressMenu from "./VoiceBubbleLongPressMenu";
import type { VoiceUploadPhase, VoiceUploadStatus } from "./VoiceMessagePlayer";

const VoiceMessagePlayer = lazy(() => import("./VoiceMessagePlayer"));

interface Props {
  // Bubble layout
  isMe: boolean;
  time: string;
  isPinned?: boolean;
  // Player props (forwarded)
  url: string;
  durationMs?: number;
  uploadStatus?: VoiceUploadStatus;
  uploadProgress?: number;
  uploadError?: string;
  uploadEndpoint?: string;
  uploadStatusCode?: number;
  uploadPhase?: VoiceUploadPhase;
  uploadBody?: string;
  // Actions
  onReply?: () => void;
  onForward?: () => void;
  onPin?: () => void;
  onResend?: () => void;
  /** For optimistic / failed bubbles — discard local entry. */
  onDiscard?: () => void;
  /** For sent bubbles — soft-delete from server (for everyone). */
  onDeleteForEveryone?: () => void;
  /** For sent bubbles — hide for me only. */
  onDeleteForMe?: () => void;
  /** Tap an emoji — persists reaction. */
  onReact?: (emoji: string) => void;
}

export default function VoiceMessageBubble({
  isMe,
  time,
  isPinned,
  url,
  durationMs,
  uploadStatus,
  uploadProgress,
  uploadError,
  uploadEndpoint,
  uploadStatusCode,
  uploadPhase,
  uploadBody,
  onReply,
  onForward,
  onPin,
  onResend,
  onDiscard,
  onDeleteForEveryone,
  onDeleteForMe,
  onReact,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const [open, setOpen] = useState(false);
  const [openDown, setOpenDown] = useState(false);

  const isFailed = uploadStatus === "failed";
  const isUploading = uploadStatus === "uploading";

  const cancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    startPos.current = null;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    fired.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    longPressTimer.current = setTimeout(() => {
      fired.current = true;
      if (wrapRef.current) {
        const rect = wrapRef.current.getBoundingClientRect();
        setOpenDown(rect.top < 320);
      }
      try { (navigator as unknown as { vibrate?: (n: number) => void }).vibrate?.(30); } catch { /* noop */ }
      setOpen(true);
    }, 400);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (dx * dx + dy * dy > 100) cancel();
  }, [cancel]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setOpenDown(rect.top < 320);
    }
    setOpen(true);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy");
    }
  }, [url]);

  const handleReact = useCallback((emoji: string) => {
    onReact?.(emoji);
  }, [onReact]);

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} relative`}>
      <div
        ref={wrapRef}
        className={`chat-no-callout relative max-w-[80%] min-w-[220px] px-3 py-2.5 rounded-2xl shadow-sm ${
          isMe ? "bg-gradient-to-br from-zinc-800 to-zinc-900 text-white rounded-br-md dark:from-zinc-100 dark:to-white dark:text-zinc-900" : "bg-muted text-foreground rounded-bl-md"
        }`}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        style={{
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        } as React.CSSProperties}
      >
        <Suspense fallback={null}>
          <VoiceMessagePlayer
            url={url}
            isMe={isMe}
            durationMs={durationMs}
            uploadStatus={uploadStatus}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            uploadEndpoint={uploadEndpoint}
            uploadStatusCode={uploadStatusCode}
            uploadPhase={uploadPhase}
            uploadBody={uploadBody}
            onRetry={onResend}
            onDiscard={onDiscard}
            onReply={onReply}
          />
        </Suspense>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={`text-[9px] ${isMe ? "text-white/60 dark:text-zinc-900/60" : "text-muted-foreground/70"}`}>
            {time}
          </span>
        </div>

        <VoiceBubbleLongPressMenu
          open={open}
          isMe={isMe}
          openDown={openDown}
          isPinned={isPinned}
          canReply={!!onReply && !isFailed && !isUploading}
          canForward={!!onForward && !isFailed && !isUploading}
          canPin={!!onPin && !isFailed && !isUploading}
          canResend={!!onResend && isFailed}
          canDelete={!!(onDiscard || onDeleteForEveryone || onDeleteForMe)}
          isFailedOrUploading={isFailed || isUploading}
          onClose={() => setOpen(false)}
          onReact={handleReact}
          onReply={onReply}
          onCopy={handleCopy}
          onForward={onForward}
          onPin={onPin}
          onResend={onResend}
          onDeleteForEveryone={
            isFailed || isUploading
              ? undefined
              : onDeleteForEveryone
          }
          onDeleteForMe={
            isFailed || isUploading
              ? onDiscard
              : (onDeleteForMe || onDiscard)
          }
        />
      </div>
    </div>
  );
}
