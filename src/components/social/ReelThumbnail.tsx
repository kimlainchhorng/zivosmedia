import { useEffect, useRef, useState, memo } from "react";
import { CheckCircle2, Clapperboard, Play, Sparkles, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReelThumbnailProps {
  url: string;
  alt?: string;
  className?: string;
  filterCss?: string | null;
  overlayClassName?: string;
  iconClassName?: string;
}

function ReelThumbnailInner({
  url,
  alt = "Reel preview",
  className,
  filterCss,
  overlayClassName,
  iconClassName,
}: ReelThumbnailProps) {
  const [poster, setPoster] = useState<string | null>(null);
  const [useVideoFallback, setUseVideoFallback] = useState(false);
  const frameReadyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    frameReadyRef.current = false;
    setPoster(null);
    setUseVideoFallback(false);

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    const cleanup = () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    const fallbackTimer = window.setTimeout(() => {
      if (!cancelled && !frameReadyRef.current) {
        setUseVideoFallback(true);
        cleanup();
      }
    }, 2500);

    const captureFrame = () => {
      if (cancelled) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 360;
        canvas.height = video.videoHeight || 640;

        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas unavailable");

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        frameReadyRef.current = true;
        setPoster(canvas.toDataURL("image/jpeg", 0.76));
      } catch {
        setUseVideoFallback(true);
      } finally {
        window.clearTimeout(fallbackTimer);
        cleanup();
      }
    };

    const handleLoadedData = () => {
      try {
        const targetTime = Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(1, Math.max(0.15, video.duration * 0.1))
          : 0.15;
        video.currentTime = targetTime;
      } catch {
        setUseVideoFallback(true);
        window.clearTimeout(fallbackTimer);
        cleanup();
      }
    };

    const handleError = () => {
      if (!cancelled) setUseVideoFallback(true);
      window.clearTimeout(fallbackTimer);
      cleanup();
    };

    video.addEventListener("loadeddata", handleLoadedData, { once: true });
    video.addEventListener("seeked", captureFrame, { once: true });
    video.addEventListener("error", handleError, { once: true });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimer);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("seeked", captureFrame);
      video.removeEventListener("error", handleError);
      cleanup();
    };
  }, [url]);

  const thumbnailSignal = poster && !useVideoFallback
    ? { label: "Poster captured", detail: "Fast preview ready", width: "100%" }
    : useVideoFallback
      ? { label: "Video fallback", detail: "Playing native preview", width: "64%" }
      : { label: "Building preview", detail: "Capturing reel frame", width: "34%" };

  return (
    <div className="absolute inset-0">
      {!poster && !useVideoFallback && (
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.2),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(3,7,18,0.98))]">
          <div className="absolute inset-0 zivo-reel-skeleton-shimmer opacity-25" />
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80 backdrop-blur-md">
            <Clapperboard className="h-3 w-3 text-cyan-200" aria-hidden="true" />
            Loading
          </div>
        </div>
      )}
      {poster && !useVideoFallback ? (
        <img
          src={poster}
          alt={alt}
          className={cn("absolute inset-0 h-full w-full object-cover", className)}
          style={{ filter: filterCss || "none" }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <video
          src={`${url}#t=0.5`}
          className={cn("absolute inset-0 h-full w-full object-cover", className)}
          style={{ filter: filterCss || "none" }}
          muted
          playsInline
          preload="auto"
        />
      )}

      {/* Gradient overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/52 via-black/8 to-transparent" />

      <div className="pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/82 backdrop-blur-md">
        {poster && !useVideoFallback ? (
          <>
            <CheckCircle2 className="h-3 w-3 text-emerald-300" aria-hidden="true" />
            Ready
          </>
        ) : useVideoFallback ? (
          <>
            <Video className="h-3 w-3 text-cyan-200" aria-hidden="true" />
            Video
          </>
        ) : (
          <>
            <Clapperboard className="h-3 w-3 text-cyan-200" aria-hidden="true" />
            Preview
          </>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-10 rounded-2xl border border-white/10 bg-black/34 px-2.5 py-2 text-white shadow-[0_16px_34px_rgba(0,0,0,0.22)] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.1em] text-white/80">{thumbnailSignal.label}</span>
              <span className="block truncate text-[9px] font-bold text-white/52">{thumbnailSignal.detail}</span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[9px] font-black text-cyan-100">
            Reel
          </span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-primary to-fuchsia-300 transition-[width] duration-300"
            style={{ width: thumbnailSignal.width }}
          />
        </div>
      </div>

      {/* Play button */}
      <div className={cn("absolute inset-0 flex items-center justify-center", overlayClassName)}>
        <div className="zivo-social-reel-play-orb flex h-12 w-12 items-center justify-center rounded-full shadow-[0_16px_34px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-105">
          <Play className={cn("ml-0.5 h-5 w-5 fill-white text-white", iconClassName)} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

const ReelThumbnail = memo(ReelThumbnailInner);
export default ReelThumbnail;
