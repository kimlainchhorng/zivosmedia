/**
 * VoiceMessagePlayer — Telegram-style waveform player with RAF-smoothed progress.
 *
 * Performance design:
 *  - The 48 bars are rendered ONCE (memoized JSX list).
 *  - Progress lives in a ref + a single CSS variable on the waveform container;
 *    the boundary bar shows a partial fill via a CSS linear-gradient driven by
 *    `--p` so the playhead glides smoothly between bars (no per-bar React
 *    re-renders 60x/sec).
 *  - `timeupdate` only syncs absolute time; a `requestAnimationFrame` loop
 *    interpolates between events using `performance.now()` + `playbackRate`.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Play from "lucide-react/dist/esm/icons/play";
import Pause from "lucide-react/dist/esm/icons/pause";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import Info from "lucide-react/dist/esm/icons/info";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { isVoiceDebugEnabled, setVoiceDebugEnabled, subscribeVoiceDebug } from "@/lib/voiceDebug";
import { getVoiceUploadDiagnostics } from "@/lib/voiceUpload";

export type VoiceUploadStatus = "uploading" | "sent" | "failed";
export type VoiceUploadPhase = "preflight" | "upload" | "insert";

interface VoiceMessagePlayerProps {
  url: string;
  /** Pre-formatted duration string (legacy). Prefer `durationMs`. */
  duration?: string;
  /** Known total duration in milliseconds — shown immediately, no waiting on metadata. */
  durationMs?: number;
  isMe: boolean;
  /** Optional upload state for in-flight optimistic bubbles. */
  uploadStatus?: VoiceUploadStatus;
  /** Upload progress 0..1 — only used while `uploadStatus === "uploading"`. */
  uploadProgress?: number;
  /** Last error message — only used while `uploadStatus === "failed"`. */
  uploadError?: string;
  /** Last attempted endpoint URL — shown in debug mode under failed bubbles. */
  uploadEndpoint?: string;
  /** Last response status code (0 = network error) — shown in debug mode. */
  uploadStatusCode?: number;
  /** Which phase failed — shown in debug mode. */
  uploadPhase?: VoiceUploadPhase;
  /** Raw response body from the failing request — shown in debug mode. */
  uploadBody?: string;
  /** Retry handler — shown when failed. */
  onRetry?: () => void;
  /** Discard handler — shown when failed or uploading. Also used as Delete in the action sheet. */
  onDiscard?: () => void;
  /** Reply handler — opens reply composer for this message via the long-press action sheet. */
  onReply?: () => void;
}

const SPEED_OPTIONS = [1, 1.5, 2] as const;
type Speed = (typeof SPEED_OPTIONS)[number];
const SPEED_STORAGE_KEY = "zivo.chat.voice.speed";
const SPEED_CHANGE_EVENT = "zivo:voice-speed-change";

const readStoredSpeed = (): Speed => {
  try {
    const raw = Number(localStorage.getItem(SPEED_STORAGE_KEY));
    if (SPEED_OPTIONS.includes(raw as Speed)) return raw as Speed;
  } catch {
    // localStorage unavailable
  }
  return 1;
};
const BAR_COUNT = 48;

// Generate deterministic pseudo-random waveform from URL hash
function generateWaveform(url: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  return Array.from({ length: count }, (_, i) => {
    const seed = Math.abs(((hash * (i + 1) * 2654435761) >> 16) % 100);
    const positionWeight = 1 - Math.abs((i / count) * 2 - 1) * 0.3;
    return 0.2 + (seed / 100) * 0.8 * positionWeight;
  });
}

export default function VoiceMessagePlayer({
  url,
  duration,
  durationMs,
  isMe,
  uploadStatus,
  uploadProgress = 0,
  uploadError,
  uploadEndpoint,
  uploadStatusCode,
  uploadPhase,
  uploadBody,
  onRetry,
  onDiscard,
  onReply,
}: VoiceMessagePlayerProps) {
  const isUploading = uploadStatus === "uploading";
  const isFailed = uploadStatus === "failed";
  const interactionDisabled = isUploading || isFailed;
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveContainerRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastSyncRef = useRef({ at: 0, time: 0 });

  const knownTotalSec = durationMs && durationMs > 0 ? durationMs / 1000 : 0;
  const [playing, setPlaying] = useState(false);
  const [totalDuration, setTotalDuration] = useState(knownTotalSec);
  const [speed, setSpeed] = useState<Speed>(() => readStoredSpeed());

  // Keep this player in sync with the user's globally-preferred speed —
  // changing speed on one bubble updates every other voice bubble in the
  // chat (and other tabs) so behaviour matches Telegram's "set once".
  useEffect(() => {
    const onChange = (e: Event) => {
      const next = (e as CustomEvent<Speed>).detail;
      if (SPEED_OPTIONS.includes(next)) {
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SPEED_STORAGE_KEY) return;
      const next = Number(e.newValue) as Speed;
      if (SPEED_OPTIONS.includes(next)) {
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
      }
    };
    window.addEventListener(SPEED_CHANGE_EVENT, onChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SPEED_CHANGE_EVENT, onChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  const [hasPlayed, setHasPlayed] = useState(false);

  const waveform = useMemo(() => generateWaveform(url, BAR_COUNT), [url]);

  // Smoothly interpolated progress via single CSS variable on the waveform.
  const writeProgress = useCallback((p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    if (waveContainerRef.current) {
      waveContainerRef.current.style.setProperty("--p", String(clamped));
    }
    if (timeLabelRef.current) {
      const audio = audioRef.current;
      const audioTotal = audio?.duration && isFinite(audio.duration) ? audio.duration : 0;
      const total = audioTotal > 0 ? audioTotal : knownTotalSec;
      const cur = clamped * total;
      const m = Math.floor(cur / 60);
      const s = Math.floor(cur % 60);
      timeLabelRef.current.textContent = `${m}:${s.toString().padStart(2, "0")}`;
    }
  }, [knownTotalSec]);

  // RAF loop: interpolate between timeupdate events for buttery smoothness.
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const audio = audioRef.current;
      if (!audio || !audio.duration || !isFinite(audio.duration)) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const now = performance.now();
      const elapsed = (now - lastSyncRef.current.at) / 1000;
      const interpolated = lastSyncRef.current.time + elapsed * audio.playbackRate;
      const safe = Math.min(audio.duration, Math.max(0, interpolated));
      writeProgress(safe / audio.duration);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing, writeProgress]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      lastSyncRef.current = { at: performance.now(), time: audio.currentTime };
      // When paused/seeking, write directly so the user sees the jump.
      if (!playing) writeProgress(audio.currentTime / audio.duration);
    };
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      writeProgress(0);
      lastSyncRef.current = { at: performance.now(), time: 0 };
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playing, writeProgress]);

  const toggle = useCallback(() => {
    if (interactionDisabled) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.playbackRate = speed;
      lastSyncRef.current = { at: performance.now(), time: audio.currentTime };
      audio
        .play()
        .then(() => {
          setPlaying(true);
          setHasPlayed(true);
        })
        .catch(() => {});
    }
  }, [playing, speed, interactionDisabled]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_OPTIONS.indexOf(speed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
      lastSyncRef.current = { at: performance.now(), time: audioRef.current.currentTime };
    }
    try {
      localStorage.setItem(SPEED_STORAGE_KEY, String(next));
    } catch {
      // ignore quota / private mode
    }
    window.dispatchEvent(new CustomEvent<Speed>(SPEED_CHANGE_EVENT, { detail: next }));
  }, [speed]);

  const handleSeekToRatio = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    audio.currentTime = clamped * audio.duration;
    lastSyncRef.current = { at: performance.now(), time: audio.currentTime };
    writeProgress(clamped);
  }, [writeProgress]);

  // Initial label fallback. Prefer known duration so we never show 0:00.
  const effectiveTotal = totalDuration > 0 ? totalDuration : knownTotalSec;
  const fallbackLabel = duration || (effectiveTotal > 0
    ? `${Math.floor(effectiveTotal / 60)}:${String(Math.floor(effectiveTotal % 60)).padStart(2, "0")}`
    : "0:00");

  // Telegram shows a tiny dot for unheard incoming voice notes
  const showUnheardDot = !isMe && !hasPlayed && !playing;

  // Static bar list — rendered once. Each bar declares its position so the
  // container's CSS var `--p` can drive a partial fill on the boundary bar.
  const bars = useMemo(() => {
    const filledClass = isMe ? "bg-primary-foreground" : "bg-primary";
    const unfilledClass = isMe ? "bg-primary-foreground/30" : "bg-primary/25";
    return waveform.map((h, i) => {
      const start = i / BAR_COUNT;
      const end = (i + 1) / BAR_COUNT;
      // CSS: clamp((p - start) / (end - start), 0, 1) → fraction filled in this bar
      const fillExpr = `clamp(0, calc((var(--p) - ${start}) / ${(end - start).toFixed(6)}), 1)`;
      return (
        <div
          key={i}
          className={`relative flex-1 min-w-[2px] rounded-full ${unfilledClass}`}
          style={{
            height: `${Math.max(0.22, h) * 100}%`,
            minHeight: "4px",
          }}
        >
          {/* Foreground "filled" overlay — width driven by container CSS var */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${filledClass}`}
            style={{ width: `calc(${fillExpr} * 100%)` }}
          />
        </div>
      );
    });
  }, [waveform, isMe]);

  const progressPct = Math.max(0, Math.min(1, uploadProgress)) * 100;
  const mutedTextClass = isMe ? "text-primary-foreground/70" : "text-muted-foreground";
  // Reactive debug flag — re-renders when toggled via long-press or window hook.
  const [debugFlag, setDebugFlag] = useState<boolean>(() => isVoiceDebugEnabled());
  useEffect(() => subscribeVoiceDebug(setDebugFlag), []);
  const debugOn = isFailed && debugFlag;
  // Config-level diagnostics — always shown on failed bubbles regardless of
  // debug flag, since a missing anon key means EVERY upload will fail.
  const diagnostics = useMemo(() => getVoiceUploadDiagnostics(), []);
  const showAnonKeyWarning = isFailed && !diagnostics.hasAnonKey;

  const copyError = useCallback(async () => {
    if (!uploadError) return;
    try {
      await navigator.clipboard?.writeText(uploadError);
      toast.success("Error copied to clipboard");
    } catch {
      toast.error("Couldn't copy error");
    }
  }, [uploadError]);

  // Long-press the failed badge to toggle debug mode (no settings UI needed).
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFailedLabelPointerDown = useCallback(() => {
    if (!isFailed) return;
    longPressTimer.current = setTimeout(() => {
      const next = !isVoiceDebugEnabled();
      setVoiceDebugEnabled(next);
      toast(next ? "Voice debug enabled" : "Voice debug disabled", {
        description: next ? "Failed bubbles will show full error reasons." : "Tap-and-hold the badge again to re-enable.",
      });
    }, 700);
  }, [isFailed]);
  const onFailedLabelPointerEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  }, []);

  // Long-press is now owned by the bubble wrapper in PersonalChat/GroupChat,
  // which renders <VoiceBubbleLongPressMenu>. We only suppress iOS callout here.

  return (
    <div
      className={`chat-no-callout relative min-w-[200px] max-w-[260px] ${debugOn || showAnonKeyWarning ? "flex flex-col gap-1.5" : ""} ${isFailed ? "ring-1 ring-orange-400/50 rounded-xl -mx-1 px-1 py-0.5" : ""}`}
      style={{
        WebkitUserSelect: "none",
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
      } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
      onDragStartCapture={(e) => e.preventDefault()}
      onSelectCapture={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-2.5">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause button (or spinner / alert when in upload state) */}
      <motion.button
        onClick={toggle}
        whileTap={interactionDisabled ? undefined : { scale: 0.85 }}
        disabled={interactionDisabled}
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-opacity ${
          isFailed
            ? "bg-orange-500/15 text-orange-500"
            : isMe
              ? "bg-primary-foreground/35 hover:bg-primary-foreground/50 text-primary-foreground"
              : "bg-primary/15 hover:bg-primary/25 text-primary"
        } ${interactionDisabled ? "cursor-not-allowed opacity-90" : ""}`}
        aria-label={isUploading ? "Uploading voice note" : isFailed ? "Voice note failed to send" : playing ? "Pause" : "Play"}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFailed ? (
          <AlertCircle className="w-4 h-4" />
        ) : playing ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </motion.button>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Waveform bars — tap/drag to seek (disabled while uploading/failed) */}
        <div className="relative">
          <div
            ref={waveContainerRef}
            className={`flex items-center gap-[2px] h-8 touch-none ${interactionDisabled ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
            style={{ ["--p" as any]: 0 }}
            onPointerDown={(e) => {
              if (interactionDisabled) return;
              (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
              const rect = e.currentTarget.getBoundingClientRect();
              handleSeekToRatio((e.clientX - rect.left) / rect.width);
            }}
            onPointerMove={(e) => {
              if (interactionDisabled) return;
              if (e.buttons !== 1 && e.pointerType !== "touch") return;
              const rect = e.currentTarget.getBoundingClientRect();
              handleSeekToRatio((e.clientX - rect.left) / rect.width);
            }}
          >
            {bars}
          </div>

          {/* Upload progress strip — sits at the bottom of the waveform */}
          {isUploading && (
            <div
              className={`absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full overflow-hidden ${
                isMe ? "bg-primary-foreground/20" : "bg-primary/15"
              }`}
              aria-label={`Uploading ${Math.round(progressPct)}%`}
            >
              <div
                className={`h-full rounded-full transition-[width] duration-200 ease-out ${
                  isMe ? "bg-primary-foreground" : "bg-primary"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Time + Speed / status row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              ref={timeLabelRef}
              className={`text-[11px] font-medium tabular-nums leading-none ${mutedTextClass}`}
            >
              {fallbackLabel}
            </span>
            {showUnheardDot && !interactionDisabled && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-primary inline-block"
                aria-label="Unheard"
              />
            )}
            {isUploading && (
              <span className={`text-[10px] leading-none truncate ${mutedTextClass}`}>
                Sending… {Math.round(progressPct)}%
              </span>
            )}
            {isFailed && (
              <span
                className="text-[10px] leading-none text-orange-500 truncate cursor-help select-none"
                title={uploadError}
                onPointerDown={onFailedLabelPointerDown}
                onPointerUp={onFailedLabelPointerEnd}
                onPointerLeave={onFailedLabelPointerEnd}
                onPointerCancel={onFailedLabelPointerEnd}
              >
                Not sent
              </span>
            )}
            {isFailed && uploadError && (
              <button
                type="button"
                onClick={copyError}
                className="h-4 w-4 rounded-full text-orange-500/80 hover:text-orange-500 flex items-center justify-center shrink-0"
                aria-label="Copy error reason"
                title="Copy error reason"
              >
                <Info className="w-3 h-3" />
              </button>
            )}
          </div>

          {isFailed ? (
            <div className="flex items-center gap-1 shrink-0">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="h-6 px-2 rounded-full bg-orange-500/15 text-orange-500 text-[10px] font-semibold flex items-center gap-1 active:scale-90 transition-transform"
                  aria-label="Resend voice note"
                  title="Resend voice"
                >
                  <RefreshCw className="w-3 h-3" />
                  Resend
                </button>
              )}
              {onDiscard && (
                <button
                  type="button"
                  onClick={onDiscard}
                  className={`h-6 w-6 rounded-full ${isMe ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"} flex items-center justify-center active:scale-90 transition-transform`}
                  aria-label="Discard voice note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : isUploading && onDiscard ? (
            <button
              type="button"
              onClick={onDiscard}
              className={`h-6 w-6 rounded-full ${isMe ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"} flex items-center justify-center active:scale-90 transition-transform shrink-0`}
              aria-label="Cancel upload"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          ) : (
            /* Speed pill — only when not in upload state */
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={cycleSpeed}
              className={`text-[10px] font-bold px-1.5 py-[2px] rounded-full leading-none ${
                speed !== 1
                  ? isMe
                    ? "bg-primary-foreground/30 text-primary-foreground"
                    : "bg-primary/20 text-primary"
                  : isMe
                  ? "bg-primary-foreground/15 text-primary-foreground/60"
                  : "bg-muted text-muted-foreground"
              }`}
              aria-label={`Playback speed ${speed}x`}
            >
              {speed}x
            </motion.button>
          )}
        </div>
      </div>
      </div>{/* /inner flex row */}
      {showAnonKeyWarning && (
        <div className="text-[10px] leading-snug text-destructive font-semibold break-all max-w-[240px]">
          ⚠️ Missing Supabase anon key (VITE_SUPABASE_PUBLISHABLE_KEY) — uploads will always fail.
        </div>
      )}
      {debugOn && uploadPhase && (
        <div className="text-[10px] leading-snug text-destructive/80 max-w-[240px] font-mono">
          phase: {uploadPhase}
        </div>
      )}
      {debugOn && uploadError && (
        <div className="text-[10px] leading-snug text-destructive/80 break-all max-w-[240px] font-mono">
          {uploadError}
        </div>
      )}
      {debugOn && uploadEndpoint && (
        <div className="text-[10px] leading-snug text-destructive/70 break-all max-w-[240px] font-mono">
          {uploadPhase === "insert" ? "POST (rest)" : "POST"} {uploadEndpoint}
        </div>
      )}
      {debugOn && typeof uploadStatusCode === "number" && (
        <div className="text-[10px] leading-snug text-destructive/70 max-w-[240px] font-mono">
          → HTTP {uploadStatusCode === 0 ? "0 (network)" : uploadStatusCode}
        </div>
      )}
      {debugOn && uploadBody && (
        <div className="text-[10px] leading-snug text-destructive/60 break-all max-w-[240px] font-mono whitespace-pre-wrap">
          {uploadBody.slice(0, 240)}
        </div>
      )}
    </div>
  );
}
