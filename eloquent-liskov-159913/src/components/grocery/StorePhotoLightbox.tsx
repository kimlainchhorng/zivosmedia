import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Grid3X3, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StorePhotoLightboxProps {
  open: boolean;
  images: string[];
  storeName: string;
  initialIndex?: number;
  positions?: Record<string, number>;
  onClose: () => void;
}

export default function StorePhotoLightbox({
  open,
  images,
  storeName,
  initialIndex = 0,
  positions,
  onClose,
}: StorePhotoLightboxProps) {
  const safeImages = useMemo(() => images.filter(Boolean), [images]);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(initialIndex, 0), Math.max(safeImages.length - 1, 0)));
  }, [initialIndex, open, safeImages.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setIndex((current) => Math.min(safeImages.length - 1, current + 1));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, safeImages.length]);

  if (!open || safeImages.length === 0) return null;

  const current = safeImages[index];
  const canPrev = index > 0;
  const canNext = index < safeImages.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex flex-col bg-black/95 text-white"
        role="dialog"
        aria-modal="true"
        aria-label={`${storeName} photos`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold sm:text-base">{storeName}</p>
            <p className="text-xs font-semibold text-white/55">
              Photo {index + 1} of {safeImages.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Close photos"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <motion.img
            key={current}
            initial={{ opacity: 0.35, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            src={current}
            alt={`${storeName} photo ${index + 1}`}
            className="h-full w-full object-contain"
            style={{ objectPosition: `center ${positions?.[current] ?? 50}%` }}
          />

          {canPrev && (
            <button
              type="button"
              onClick={() => setIndex((currentIndex) => currentIndex - 1)}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/70 sm:left-6"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {canNext && (
            <button
              type="button"
              onClick={() => setIndex((currentIndex) => currentIndex + 1)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur transition hover:bg-black/70 sm:right-6"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-black/80 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/60">
            <Grid3X3 className="h-3.5 w-3.5" />
            All photos
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {safeImages.map((image, imageIndex) => (
              <button
                key={`${image}-${imageIndex}`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                className={cn(
                  "h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition sm:h-20 sm:w-32",
                  imageIndex === index
                    ? "border-white ring-2 ring-white/70"
                    : "border-white/15 opacity-65 hover:opacity-100",
                )}
                aria-label={`Show photo ${imageIndex + 1}`}
              >
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
	                  style={{ objectPosition: `center ${positions?.[image] ?? 50}%` }}
	                  loading="lazy"
	                  decoding="async"
	                />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
