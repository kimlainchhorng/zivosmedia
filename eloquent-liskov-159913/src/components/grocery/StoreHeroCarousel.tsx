/**
 * StoreHeroCarousel — Booking-style editorial photo wall for store profiles.
 */
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreHeroCarouselProps {
  images: string[];
  storeName: string;
  positions?: Record<string, number>;
  onOpenGallery?: (index: number) => void;
}

const MOSAIC_SLOTS = 8;

function galleryLabel(photoCount: number) {
  if (photoCount <= MOSAIC_SLOTS) return `${photoCount} photos`;
  return `+${photoCount - (MOSAIC_SLOTS - 1)} photos`;
}

function PhotoTile({
  src,
  index,
  storeName,
  positions,
  className,
  imageClassName,
  priority = false,
  overlayLabel,
  onOpenGallery,
}: {
  src: string;
  index: number;
  storeName: string;
  positions?: Record<string, number>;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  overlayLabel?: string;
  onOpenGallery?: (index: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpenGallery?.(index)}
      className={cn(
        "group relative h-full min-h-0 w-full overflow-hidden bg-muted text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className
      )}
      aria-label={`Open all photos, starting at photo ${index + 1}`}
    >
      <img
        src={src}
        alt={`${storeName} photo ${index + 1}`}
        className={cn(
          "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]",
          imageClassName
        )}
	        style={{ objectPosition: `center ${positions?.[src] ?? 50}%` }}
	        loading={priority ? "eager" : "lazy"}
	        decoding="async"
	      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-black/0 opacity-80" />
      {overlayLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-black shadow-xl backdrop-blur-md">
            <ImageIcon className="h-4 w-4" />
            {overlayLabel}
          </span>
        </div>
      )}
    </button>
  );
}

export default function StoreHeroCarousel({ images, storeName, positions, onOpenGallery }: StoreHeroCarouselProps) {
  if (images.length === 0) return null;
  const getImageAt = (index: number) => images[index % images.length];
  const getIndexAt = (index: number) => index % images.length;
  const stripSlots = images.length >= 5 ? [3, 4, 5, 6, 7] : [1, 2, 3];

  return (
    <div className="h-full w-full bg-background p-1.5">
      <div className="grid h-full grid-cols-2 grid-rows-[1.4fr_0.75fr_0.75fr] gap-1.5 md:grid-cols-[2fr_1fr] md:grid-rows-[1fr_1fr_0.58fr] md:gap-2">
        <PhotoTile
          src={getImageAt(0)}
          index={getIndexAt(0)}
          storeName={storeName}
          positions={positions}
          priority
          onOpenGallery={onOpenGallery}
          className="col-span-2 row-span-1 rounded-t-2xl md:col-span-1 md:row-span-2 md:rounded-l-2xl md:rounded-tr-none"
        />
        <PhotoTile
          src={getImageAt(1)}
          index={getIndexAt(1)}
          storeName={storeName}
          positions={positions}
          onOpenGallery={onOpenGallery}
          className="hidden md:block md:rounded-tr-2xl"
        />
        <PhotoTile
          src={getImageAt(2)}
          index={getIndexAt(2)}
          storeName={storeName}
          positions={positions}
          onOpenGallery={onOpenGallery}
          className="hidden md:block"
        />

        <div className="col-span-2 grid min-h-0 grid-cols-3 gap-1.5 md:grid-cols-5 md:gap-2">
          {stripSlots.map((slot, stripIndex) => {
            const imageIndex = getIndexAt(slot);
            const isLast = stripIndex === stripSlots.length - 1;
            return (
              <PhotoTile
                key={`${slot}-${getImageAt(slot)}`}
                src={getImageAt(slot)}
                index={imageIndex}
                storeName={storeName}
                positions={positions}
                onOpenGallery={onOpenGallery}
                overlayLabel={isLast ? galleryLabel(images.length) : undefined}
                className={cn(
                  stripIndex >= 3 && "hidden md:block",
                  stripIndex === 0 && "rounded-bl-2xl",
                  isLast && "rounded-br-2xl"
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
