import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Play from "lucide-react/dist/esm/icons/play";
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";

export interface ReelVideo {
  id: string;
  url: string;
  /** Sort key (ISO timestamp). Ties broken by id. */
  order: string;
  protected?: boolean;
}

interface ReelFeedApi {
  register: (video: ReelVideo) => void;
  unregister: (id: string) => void;
  open: (id: string) => void;
}

const ReelFeedContext = createContext<ReelFeedApi | null>(null);

export function useReelFeed(): ReelFeedApi | null {
  return useContext(ReelFeedContext);
}

/**
 * Provides a single Reels-style fullscreen viewer shared by every video bubble
 * in a conversation. Bubbles register their (signed) video URL; opening one
 * starts the viewer at that video and auto-advances through the rest.
 */
export function ReelFeedProvider({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<Map<string, ReelVideo>>(new Map());
  const [version, setVersion] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const register = useCallback((video: ReelVideo) => {
    const prev = registryRef.current.get(video.id);
    if (prev && prev.url === video.url && prev.order === video.order) return;
    registryRef.current.set(video.id, video);
    setVersion((v) => v + 1);
  }, []);

  const unregister = useCallback((id: string) => {
    if (registryRef.current.delete(id)) setVersion((v) => v + 1);
  }, []);

  const open = useCallback((id: string) => setOpenId(id), []);

  const api = useMemo<ReelFeedApi>(
    () => ({ register, unregister, open }),
    [register, unregister, open],
  );

  const videos = useMemo(() => {
    return Array.from(registryRef.current.values()).sort((a, b) =>
      a.order === b.order ? a.id.localeCompare(b.id) : a.order.localeCompare(b.order),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const startIndex = openId ? videos.findIndex((v) => v.id === openId) : -1;

  return (
    <ReelFeedContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {openId && startIndex >= 0 && (
          <ReelViewer videos={videos} startIndex={startIndex} onClose={() => setOpenId(null)} />
        )}
      </AnimatePresence>
    </ReelFeedContext.Provider>
  );
}

/** Reel-style fullscreen video player with auto-advance + swipe navigation. */
export function ReelViewer({
  videos,
  startIndex,
  onClose,
}: {
  videos: ReelVideo[];
  startIndex: number;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showResumeHint, setShowResumeHint] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userPausedRef = useRef(false);
  const lastProgressTimeRef = useRef(0);
  const stallSamplesRef = useRef(0);

  const current = videos[index];
  const isProtected = !!current?.protected;

  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  useEffect(() => {
    hideControlsAfterDelay();
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, [hideControlsAfterDelay]);

  // Reset per-video state when the active video changes.
  useEffect(() => {
    setProgress(0);
    setIsPlaying(true);
    setShowResumeHint(false);
    userPausedRef.current = false;
    lastProgressTimeRef.current = 0;
    stallSamplesRef.current = 0;
    setLiked(false);
    hideControlsAfterDelay();
  }, [index, hideControlsAfterDelay]);

  // Some mobile/low-power contexts pause autoplayed video after mount or after
  // tab/background transitions. Try to resume when the page is active again.
  useEffect(() => {
    const tryResume = () => {
      const v = videoRef.current;
      if (!v || document.visibilityState !== "visible" || !v.paused || userPausedRef.current) return;
      void v.play().then(() => setIsPlaying(true)).catch(() => {
        // Browsers block UNMUTED autoplay without a direct user gesture, which
        // leaves the reel frozen on its first frame. Mute and retry so playback
        // always starts; the user can unmute with the speaker button.
        v.muted = true;
        setIsMuted(true);
        void v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      });
    };

    const onVisibilityChange = () => tryResume();
    const onWindowFocus = () => tryResume();

    // Initial pass after the element mounts/changes source.
    const tid = setTimeout(tryResume, 60);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      clearTimeout(tid);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [index]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= videos.length) return;
      setIndex(next);
    },
    [videos.length],
  );

  const togglePlay = useCallback(() => {
    hideControlsAfterDelay();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      userPausedRef.current = false;
      void v.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      userPausedRef.current = true;
      v.pause();
      setIsPlaying(false);
    }
  }, [hideControlsAfterDelay]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    lastProgressTimeRef.current = v.currentTime;
    stallSamplesRef.current = 0;
    if (showResumeHint) setShowResumeHint(false);
    setProgress((v.currentTime / (v.duration || 1)) * 100);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended || document.visibilityState !== "visible") return;
      const now = v.currentTime;
      const moved = now - lastProgressTimeRef.current;
      if (moved < 0.01 && v.readyState >= 2) {
        stallSamplesRef.current += 1;
        if (stallSamplesRef.current >= 2) {
          void v.play().catch(() => {
            setIsPlaying(false);
            setShowResumeHint(true);
          });
        }
      } else {
        stallSamplesRef.current = 0;
      }
      lastProgressTimeRef.current = now;
    }, 700);
    return () => window.clearInterval(id);
  }, [index]);

  const forceResumePlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    userPausedRef.current = false;
    setShowResumeHint(false);
    void v.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false);
      setShowResumeHint(true);
    });
  }, []);

  const handleEnded = () => {
    if (index + 1 < videos.length) {
      setIndex(index + 1);
    } else {
      // Last reel: loop in place.
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        v.play();
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const SWIPE = 70;
    if (info.offset.y < -SWIPE) {
      goTo(index + 1);
    } else if (info.offset.y > SWIPE) {
      goTo(index - 1);
    }
  };

  if (!current) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      onClick={togglePlay}
    >
      {/* Video */}
      <video
        key={current.id}
        ref={videoRef}
        src={current.url}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        muted={isMuted}
        preload="auto"
        controlsList={isProtected ? "nodownload noplaybackrate" : undefined}
        disablePictureInPicture={isProtected}
        onContextMenu={(event) => event.preventDefault()}
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          const v = videoRef.current;
          if (!v) return;
          // If pause wasn't requested by user interaction, try to recover.
          if (!userPausedRef.current && document.visibilityState === "visible" && !v.ended) {
            setTimeout(() => {
              const cur = videoRef.current;
              if (!cur || userPausedRef.current || cur.ended || document.visibilityState !== "visible") return;
              void cur.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }, 80);
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onStalled={() => {
          if (!userPausedRef.current) forceResumePlayback();
        }}
        onWaiting={() => {
          if (!userPausedRef.current) forceResumePlayback();
        }}
        onEnded={handleEnded}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
      />

      {/* Top bar */}
      <motion.div
        animate={{ opacity: showControls ? 1 : 0 }}
        className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent pt-[max(var(--zivo-safe-top,0px),12px)] px-4 pb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white text-[15px] font-bold">Reels</span>
            {videos.length > 1 && (
              <span className="text-white/70 text-[12px] font-semibold">
                {index + 1}/{videos.length}
              </span>
            )}
            {isProtected && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                Protected
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
        </div>
      </motion.div>

      {/* Center play/pause indicator */}
      <AnimatePresence>
        {!isPlaying && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
          >
            <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showResumeHint && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              forceResumePlayback();
            }}
            className="pointer-events-auto rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-5 py-2.5 backdrop-blur"
          >
            Tap to resume video
          </button>
        </div>
      )}

      {/* Right-side action buttons (Reel-style) */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center ${liked ? "bg-red-500/20" : "bg-white/10"}`}
          >
            <Heart className={`w-6 h-6 ${liked ? "text-red-500 fill-red-500" : "text-white"}`} />
          </div>
          <span className="text-white text-[10px] font-semibold">Like</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-[10px] font-semibold">Reply</span>
        </motion.button>

        {!isProtected && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-[10px] font-semibold">Share</span>
          </motion.button>
        )}

        <motion.button whileTap={{ scale: 0.8 }} onClick={toggleMute} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
            {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
          </div>
          <span className="text-white text-[10px] font-semibold">{isMuted ? "Unmute" : "Mute"}</span>
        </motion.button>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/50 to-transparent pb-[max(var(--zivo-safe-bottom,0px),8px)] px-4 pt-6">
        <div className="w-full h-1 rounded-full bg-white/20 cursor-pointer mb-3" onClick={handleSeek}>
          <motion.div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
