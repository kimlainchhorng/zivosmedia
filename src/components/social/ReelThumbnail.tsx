import { useEffect, useRef, useState, memo } from "react";
import { Play } from "lucide-react";
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

  return (
    <div className="absolute inset-0">
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />

      {/* Play button */}
      <div className={cn("absolute inset-0 flex items-center justify-center", overlayClassName)}>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 shadow-lg">
          <Play className={cn("ml-0.5 h-5 w-5 fill-white text-white", iconClassName)} />
        </div>
      </div>
    </div>
  );
}

const ReelThumbnail = memo(ReelThumbnailInner);
export default ReelThumbnail;
