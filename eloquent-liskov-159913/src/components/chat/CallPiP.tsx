/**
 * CallPiP — Floating picture-in-picture mini call overlay (FaceTime 2026 style)
 * Draggable but constrained to the device safe-area (notch / status bar /
 * home indicator / bottom nav / keyboard). Snaps to nearest horizontal edge.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import PhoneOff from "lucide-react/dist/esm/icons/phone-off";
import Maximize2 from "lucide-react/dist/esm/icons/maximize-2";
import Mic from "lucide-react/dist/esm/icons/mic";
import MicOff from "lucide-react/dist/esm/icons/mic-off";
import Video from "lucide-react/dist/esm/icons/video";
import VideoOff from "lucide-react/dist/esm/icons/video-off";
import { motion, useAnimation, type PanInfo } from "framer-motion";

interface CallPiPProps {
  remoteStream: MediaStream | null;
  recipientName: string;
  recipientAvatar?: string | null;
  isMuted: boolean;
  duration: number;
  callType?: "voice" | "video";
  isCameraOff?: boolean;
  onExpand: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera?: () => void;
}

const PADDING = 8;
// Reserve room for the bottom mobile nav (matches ZivoMobileNav height ~64px)
const BOTTOM_NAV_RESERVE = 72;

function readInset(name: string): number {
  if (typeof window === "undefined") return 0;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!v) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function CallPiP({
  remoteStream,
  recipientName,
  recipientAvatar,
  isMuted,
  duration,
  callType,
  isCameraOff,
  onExpand,
  onEndCall,
  onToggleMute,
  onToggleCamera,
}: CallPiPProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controls = useAnimation();
  const [hasVideo, setHasVideo] = useState(false);

  const W = 168;
  const H = callType === "video" ? 230 : 88;

  // Compute the safe drag area in viewport coordinates.
  const getBounds = useCallback(() => {
    const vw = window.visualViewport?.width ?? window.innerWidth;
    const vh = window.visualViewport?.height ?? window.innerHeight;
    const safeTop = Math.max(readInset("--safe-top"), 12);
    const safeBottom = Math.max(readInset("--safe-bottom"), 12);
    const safeLeft = Math.max(readInset("--safe-left"), 0);
    const safeRight = Math.max(readInset("--safe-right"), 0);
    return {
      minX: safeLeft + PADDING,
      maxX: vw - safeRight - PADDING - W,
      minY: safeTop + PADDING,
      maxY: vh - safeBottom - BOTTOM_NAV_RESERVE - PADDING - H,
    };
  }, [W, H]);

  const clamp = useCallback(
    (x: number, y: number) => {
      const b = getBounds();
      return {
        x: Math.min(Math.max(x, b.minX), Math.max(b.minX, b.maxX)),
        y: Math.min(Math.max(y, b.minY), Math.max(b.minY, b.maxY)),
      };
    },
    [getBounds]
  );

  // Initial position: top-right inside the safe area.
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { x: 16, y: 100 };
    const b = getBounds();
    return { x: b.maxX, y: Math.max(b.minY, 100) };
  });

  // Re-clamp on viewport / orientation / keyboard changes.
  useEffect(() => {
    const reclamp = () => {
      setPos((p) => {
        const c = clamp(p.x, p.y);
        controls.start({ x: c.x, y: c.y, transition: { type: "spring", damping: 22, stiffness: 260 } });
        return c;
      });
    };
    window.addEventListener("resize", reclamp);
    window.addEventListener("orientationchange", reclamp);
    window.visualViewport?.addEventListener("resize", reclamp);
    return () => {
      window.removeEventListener("resize", reclamp);
      window.removeEventListener("orientationchange", reclamp);
      window.visualViewport?.removeEventListener("resize", reclamp);
    };
  }, [clamp, controls]);

  // Snap to nearest horizontal edge after drag end (iMessage-style magnet).
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const b = getBounds();
    const releasedX = info.point.x - W / 2;
    const releasedY = info.point.y - H / 2;
    const midX = (b.minX + b.maxX) / 2;
    const targetX = releasedX < midX ? b.minX : b.maxX;
    const c = clamp(targetX, releasedY);
    setPos(c);
    controls.start({ x: c.x, y: c.y, transition: { type: "spring", damping: 22, stiffness: 260 } });
  };

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      void videoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (callType !== "video" || !remoteStream) {
      const resetTimer = window.setTimeout(() => setHasVideo(false), 0);
      return () => window.clearTimeout(resetTimer);
    }

    const syncVideoState = () => {
      setHasVideo(
        remoteStream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled && !track.muted),
      );
    };
    const watchedTracks = new Set<MediaStreamTrack>();
    const watchTrack = (track: MediaStreamTrack) => {
      if (track.kind !== "video" || watchedTracks.has(track)) return;
      watchedTracks.add(track);
      track.addEventListener("mute", syncVideoState);
      track.addEventListener("unmute", syncVideoState);
      track.addEventListener("ended", syncVideoState);
    };
    const unwatchTracks = () => {
      watchedTracks.forEach((track) => {
        track.removeEventListener("mute", syncVideoState);
        track.removeEventListener("unmute", syncVideoState);
        track.removeEventListener("ended", syncVideoState);
      });
      watchedTracks.clear();
    };
    const handleTrackChange = (event: MediaStreamTrackEvent) => {
      watchTrack(event.track);
      syncVideoState();
    };

    const syncTimer = window.setTimeout(syncVideoState, 0);
    remoteStream.addEventListener("addtrack", handleTrackChange);
    remoteStream.addEventListener("removetrack", syncVideoState);
    remoteStream.getVideoTracks().forEach(watchTrack);

    return () => {
      window.clearTimeout(syncTimer);
      remoteStream.removeEventListener("addtrack", handleTrackChange);
      remoteStream.removeEventListener("removetrack", syncVideoState);
      unwatchTracks();
    };
  }, [callType, remoteStream]);

  // Animate to the initial position once mounted.
  useEffect(() => {
    controls.start({ x: pos.x, y: pos.y, transition: { duration: 0 } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDur = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const initials = (recipientName || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.15}
      dragConstraints={{
        top: getBounds().minY,
        bottom: getBounds().maxY,
        left: getBounds().minX,
        right: getBounds().maxX,
      }}
      onDragEnd={handleDragEnd}
      animate={controls}
      className="fixed top-0 left-0 z-[70] shadow-2xl rounded-[22px] overflow-hidden border border-primary/20 bg-background/90 backdrop-blur-xl touch-none"
      style={{ width: W, height: H }}
      initial={{ opacity: 0, scale: 0.5 }}
      transition={{ type: "spring", damping: 20 }}
    >
      {hasVideo ? (
        <video
          ref={videoRef}
	          autoPlay
	          playsInline
	          muted
	          preload="none"
	          className="w-full h-[142px] object-cover bg-muted"
        />
      ) : callType === "video" ? (
        <div className="relative grid h-[142px] place-items-center overflow-hidden bg-zinc-950">
          {recipientAvatar && (
            <img
              src={recipientAvatar}
	              alt=""
	              aria-hidden="true"
	              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-xl"
	              loading="lazy"
	              decoding="async"
	            />
          )}
          <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white/10 text-xl font-bold text-white ring-1 ring-white/15">
            {recipientAvatar ? (
	              <img
	                src={recipientAvatar}
	                alt=""
	                className="h-full w-full object-cover"
	                loading="lazy"
	                decoding="async"
	              />
            ) : (
              initials
            )}
          </div>
        </div>
      ) : null}

      <div className="p-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-foreground truncate flex-1">{recipientName}</span>
          <span className="text-[9px] text-primary font-mono tabular-nums bg-primary/5 px-1.5 py-0.5 rounded-full">{formatDur(duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute call" : "Mute call"}
            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors ${
              isMuted ? "bg-destructive/15 text-destructive" : "bg-foreground/[0.06] text-foreground/60"
            }`}
          >
            {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          </motion.button>
          {callType === "video" && onToggleCamera && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onToggleCamera}
              aria-label={isCameraOff ? "Enable camera" : "Disable camera"}
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                isCameraOff ? "bg-destructive/15 text-destructive" : "bg-foreground/[0.06] text-foreground/60"
              }`}
            >
              {isCameraOff ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onExpand}
            aria-label="Expand call"
            className="h-7 w-7 rounded-full bg-foreground/[0.06] text-foreground/60 flex items-center justify-center"
          >
            <Maximize2 className="w-3 h-3" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={onEndCall}
            aria-label="End call"
            className="h-7 flex-1 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] font-medium gap-1"
          >
            <PhoneOff className="w-3 h-3" /> End
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
