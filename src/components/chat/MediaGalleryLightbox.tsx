/**
 * MediaGalleryLightbox - fullscreen carousel for photos/videos.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Download from "lucide-react/dist/esm/icons/download";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Play from "lucide-react/dist/esm/icons/play";
import { toast } from "sonner";

type GalleryItem = {
  id: string;
  url: string;
  type: "image" | "video";
  filename?: string;
};

interface Props {
  open: boolean;
  images: GalleryItem[];
  initialIndex?: number;
  onClose: () => void;
}

function getDownloadName(item: GalleryItem, index: number): string {
  if (item.filename) return item.filename;
  try {
    const pathname = new URL(item.url, window.location.href).pathname;
    const name = pathname.split("/").filter(Boolean).pop();
    if (name && name.includes(".")) return name;
  } catch {
    // Blob/data URLs cannot always produce a useful filename.
  }
  return `zivo-chat-${item.type}-${index + 1}.${item.type === "video" ? "mp4" : "jpg"}`;
}

export default function MediaGalleryLightbox({ open, images, initialIndex = 0, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
  }, [images.length, initialIndex, open]);

  const current = images[currentIndex];
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < images.length - 1;
  const goPrev = useCallback(() => setCurrentIndex((c) => Math.max(0, c - 1)), []);
  const goNext = useCallback(() => setCurrentIndex((c) => Math.min(images.length - 1, c + 1)), [images.length]);
  const typeLabel = current?.type === "video" ? "Video" : "Photo";
  const downloadName = current ? getDownloadName(current, currentIndex) : "";
  const shareTitle = useMemo(
    () => `${typeLabel} ${currentIndex + 1} of ${images.length}`,
    [currentIndex, images.length, typeLabel],
  );

  const handleDownload = useCallback((event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!current) return;
    const link = document.createElement("a");
    link.href = current.url;
    link.download = downloadName;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [current, downloadName]);

  const handleShare = useCallback(async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!current) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ZIVO chat media", text: shareTitle, url: current.url });
        return;
      }
      await navigator.clipboard.writeText(current.url);
      toast.success("Media link copied");
    } catch {
      toast.error("Couldn't share this media");
    }
  }, [current, shareTitle]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canPrev) goPrev();
      if (event.key === "ArrowRight" && canNext) goNext();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleDownload();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canNext, canPrev, goNext, goPrev, handleDownload, onClose, open]);

  if (!open || !current || images.length === 0) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[1600] flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="Media viewer"
        >
          <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 py-3 sm:px-5">
            <div className="min-w-0 text-white">
              <p className="text-sm font-semibold leading-tight">{typeLabel}</p>
              <p className="text-xs text-white/65">
                {currentIndex + 1} of {images.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShare}
                className="h-10 w-10 rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Share media"
                title="Share"
              >
                <Share2 className="mx-auto h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="h-10 w-10 rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Save media"
                title="Save"
              >
                <Download className="mx-auto h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                aria-label="Close media viewer"
                title="Close"
              >
                <X className="mx-auto h-5 w-5" />
              </button>
            </div>
          </div>

          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x > 80 && canPrev) goPrev();
              if (info.offset.x < -80 && canNext) goNext();
            }}
            className="flex h-full w-full items-center justify-center px-4 pb-24 pt-16 sm:pb-28"
          >
            {current.type === "image" ? (
              <img
                src={current.url}
                alt=""
                className="max-h-full max-w-full rounded-lg object-contain"
                loading="eager"
                decoding="async"
              />
            ) : (
              <video src={current.url} controls preload="metadata" className="max-h-full max-w-full rounded-lg object-contain" />
            )}
          </motion.div>

          {canPrev && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 sm:left-4"
              aria-label="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {canNext && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              className="absolute right-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 sm:right-4"
              aria-label="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100vw-24px)] -translate-x-1/2 gap-2 overflow-x-auto rounded-2xl bg-black/55 p-2 shadow-2xl backdrop-blur sm:bottom-4">
              {images.map((item, index) => (
                <button
                  key={item.id || `${item.url}-${index}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition-all ${
                    index === currentIndex ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]" : "border-white/15 opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Open ${item.type} ${index + 1}`}
                >
                  {item.type === "video" ? (
                    <>
                      <video src={`${item.url}#t=0.1`} className="h-full w-full object-cover" muted preload="metadata" playsInline />
                      <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                        <Play className="h-4 w-4" fill="currentColor" />
                      </span>
                    </>
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
