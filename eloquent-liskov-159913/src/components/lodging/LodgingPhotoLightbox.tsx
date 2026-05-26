/**
 * LodgingPhotoLightbox — full-screen photo viewer with zoom controls,
 * keyboard nav, LQIP placeholders, and prev/next.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Plus, Minus, RotateCcw, BedDouble } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ZoomableImage } from "./ZoomableImage";
import { getLqipUrl, inferCaptionFromUrl } from "@/lib/lqip";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  photos: string[];
  index: number;
  onIndexChange: (i: number) => void;
  name: string;
}

export function LodgingPhotoLightbox({
  open, onOpenChange, photos, index, onIndexChange, name,
}: Props) {
  const total = photos.length;
  const [scale, setScale] = useState(1);
  const [zoomNudge, setZoomNudge] = useState(1); // controlled zoom from buttons (multiplier hint)
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [errored, setErrored] = useState<Record<number, boolean>>({});

  const next = useCallback(() => {
    if (total <= 1) return;
    onIndexChange((index + 1) % total);
    setZoomNudge(1);
  }, [index, total, onIndexChange]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    onIndexChange((index - 1 + total) % total);
    setZoomNudge(1);
  }, [index, total, onIndexChange]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "+" || e.key === "=") { e.preventDefault(); setZoomNudge((z) => Math.min(4, z + 0.5)); }
      else if (e.key === "-" || e.key === "_") { e.preventDefault(); setZoomNudge((z) => Math.max(1, z - 0.5)); }
      else if (e.key === "0") { e.preventDefault(); setZoomNudge(1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const src = photos[index];
  const lqip = getLqipUrl(src);
  const caption = inferCaptionFromUrl(src);
  const isLoaded = loaded[index];
  const isErrored = errored[index];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} photo viewer`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <div className="text-xs font-medium tabular-nums">
          Photo {index + 1} of {total}
          {caption && <span className="ml-2 text-white/60">· {caption}</span>}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close photo viewer"
          className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 relative overflow-hidden">
        {/* LQIP layer */}
        {lqip && !isLoaded && !isErrored && (
          <img
            src={lqip}
            alt=""
            aria-hidden
	            className="absolute inset-0 w-full h-full object-contain"
	            loading="lazy"
	            decoding="async"
	            style={{ filter: "blur(20px)", transform: "scale(1.05)" }}
	          />
        )}
        {!lqip && !isLoaded && !isErrored && (
          <Skeleton className="absolute inset-0" />
        )}
        {isErrored ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
            <BedDouble className="h-12 w-12" />
            <span className="text-sm">Image unavailable</span>
          </div>
        ) : (
          <ZoomableImage
            active
            onScaleChange={setScale}
            resetKey={`${index}-${zoomNudge}`}
            className="w-full h-full"
          >
            <img
              key={`${src}-${zoomNudge}`}
              src={src}
	              alt={`${name} photo ${index + 1} of ${total}`}
	              loading="lazy"
	              decoding="async"
	              onLoad={() => setLoaded((p) => ({ ...p, [index]: true }))}
              onError={() => setErrored((p) => ({ ...p, [index]: true }))}
              draggable={false}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
                objectFit: "contain",
                transform: zoomNudge !== 1 ? `scale(${zoomNudge})` : undefined,
                transition: "opacity 400ms ease, transform 200ms ease-out",
                opacity: isLoaded ? 1 : 0,
                userSelect: "none",
              }}
            />
          </ZoomableImage>
        )}

        {scale > 1.05 && (
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold tabular-nums">
            {Math.round(scale * 100)}%
          </div>
        )}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-2 px-4 py-3 text-white/90">
        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setZoomNudge((z) => Math.max(1, z - 0.5))}
            aria-label="Zoom out"
            className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoomNudge(1)}
            aria-label="Reset zoom"
            className="h-8 px-3 rounded-full hover:bg-white/10 flex items-center justify-center text-[11px] font-semibold tabular-nums gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {Math.round(Math.max(scale, zoomNudge) * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoomNudge((z) => Math.min(4, z + 0.5))}
            aria-label="Zoom in"
            className="h-8 w-8 rounded-full hover:bg-white/10 flex items-center justify-center"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
