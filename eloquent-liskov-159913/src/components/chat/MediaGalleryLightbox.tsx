/**
 * MediaGalleryLightbox — fullscreen carousel for photos/videos
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";

interface Props {
  open: boolean;
  images: { id: string; url: string; type: "image" | "video" }[];
  initialIndex?: number;
  onClose: () => void;
}

export default function MediaGalleryLightbox({ open, images, initialIndex = 0, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  if (!open || images.length === 0) return null;

  const current = images[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < images.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          <button type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center w-full h-full px-4"
          >
            {current.type === "image" ? (
	              <img
	                src={current.url}
	                alt=""
	                className="max-w-full max-h-full object-contain rounded-lg"
	                loading="eager"
	                decoding="async"
	              />
	            ) : (
	              <video src={current.url} controls preload="metadata" className="max-w-full max-h-full object-contain rounded-lg" />
            )}
          </motion.div>

          {canPrev && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(c => c - 1); }}
              className="absolute left-4 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-90"
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {canNext && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(c => c + 1); }}
              className="absolute right-4 z-10 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white active:scale-90"
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 px-3 py-2 rounded-full bg-black/50 text-xs text-white">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
