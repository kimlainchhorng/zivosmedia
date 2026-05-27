import { useEffect, useRef, type VideoHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface LazyVideoProps extends Omit<VideoHTMLAttributes<HTMLVideoElement>, "preload"> {
  /** Use "auto" only for intentional above-the-fold playback. */
  preload?: "none" | "metadata" | "auto";
  pauseWhenOffscreen?: boolean;
}

export function LazyVideo({
  className,
  preload = "metadata",
  pauseWhenOffscreen = true,
  muted = true,
  playsInline = true,
  ...props
}: LazyVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pauseWhenOffscreen || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting && !el.paused) el.pause();
      },
      { rootMargin: "160px 0px", threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pauseWhenOffscreen]);

  return (
    <video
      ref={ref}
      className={cn("h-full w-full object-cover", className)}
      muted={muted}
      playsInline={playsInline}
      preload={preload}
      {...props}
    />
  );
}

export default LazyVideo;
