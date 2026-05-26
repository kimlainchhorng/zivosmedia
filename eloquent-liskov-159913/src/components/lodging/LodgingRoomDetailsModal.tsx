/**
 * LodgingRoomDetailsModal — full room information view with photo carousel,
 * description, amenities, add-ons, and policies. Sticky footer with Reserve.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, BedDouble, Users, Coffee, Maximize2, Clock,
  ShieldCheck, Plus, Expand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel, CarouselContent, CarouselItem, type CarouselApi,
} from "@/components/ui/carousel";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import { ZoomableImage } from "@/components/lodging/ZoomableImage";
import { LodgingPhotoLightbox } from "@/components/lodging/LodgingPhotoLightbox";
import { getLqipUrl, inferCaptionFromUrl } from "@/lib/lqip";
import { optimizeImage } from "@/lib/optimizeImage";
import type { LodgeAddon } from "@/hooks/lodging/useLodgeRooms";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  name: string;
  type?: string | null;
  beds?: string | null;
  maxGuests: number;
  sizeSqm?: number | null;
  baseRateCents: number;
  originalRateCents?: number | null;
  description?: string | null;
  amenities?: string[];
  breakfastIncluded?: boolean;
  photos?: string[];
  coverIndex?: number;
  addons?: LodgeAddon[];
  cancellationPolicy?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  onReserve: () => void;
}

const POLICY_LABELS: Record<string, string> = {
  flexible: "Flexible — full refund up to 24h before check-in",
  moderate: "Moderate — full refund up to 5 days before",
  strict: "Strict — 50% refund up to 7 days before",
  non_refundable: "Non-refundable",
};

const PER_LABEL: Record<LodgeAddon["per"], string> = {
  night: "per night",
  guest: "per guest",
  stay: "per stay",
  person_night: "per guest / night",
};

// Booking.com-style amenity groupings (must mirror the admin editor)
const AMENITY_GROUPS: { label: string; items: string[] }[] = [
  { label: "Private bathroom", items: ["Free toiletries", "Shower", "Bathtub", "Bathrobe", "Slippers", "Hairdryer", "Bidet", "Toilet", "Toilet paper", "Towels", "Towels/Sheets (extra fee)", "Hot shower"] },
  { label: "Bedroom", items: ["Linens", "Wardrobe or closet", "Extra long beds (> 2m)", "Alarm clock"] },
  { label: "View", items: ["Garden view", "Pool view", "Sea view", "Mountain view", "City view", "River view", "Courtyard view", "Landmark view"] },
  { label: "Outdoors", items: ["Balcony", "Terrace", "Patio", "Outdoor furniture", "Beach access", "Beachfront"] },
  { label: "Facilities", items: ["Carpeted", "Electric kettle", "Wardrobe or closet", "Socket near the bed", "Dining area", "Desk", "Clothes rack", "Sitting area", "Drying rack for clothing", "Minibar", "Tile/Marble floor", "Wooden/Parquet floor", "Soundproofing", "Heating", "Air conditioning", "Fan", "Iron", "Ironing facilities", "Safety deposit box", "Safe", "Fireplace", "Private entrance"] },
  { label: "Food & drink", items: ["Mini-bar", "Mini-fridge", "Refrigerator", "Coffee machine", "Tea/Coffee maker", "Coffee maker", "Kettle", "Kitchenette", "Microwave", "Dishwasher", "Stovetop", "Oven", "Toaster", "Dining table"] },
  { label: "Media & technology", items: ["Wi-Fi", "Free Wi-Fi", "TV", "Flat-screen TV", "Smart TV", "Cable channels", "Satellite channels", "Streaming service (Netflix)", "Netflix", "Telephone", "Laptop safe"] },
  { label: "Family", items: ["Crib available", "Baby cot on request", "Family-friendly", "Children's cribs/cots"] },
  { label: "Wellness", items: ["Jacuzzi", "Hot tub", "Private pool", "Sauna", "Spa tub"] },
  { label: "Services", items: ["Daily housekeeping", "Room service", "24h reception", "Wake-up service", "Laundry service"] },
  { label: "Accessibility & policy", items: ["Wheelchair accessible", "Upper floors accessible by elevator", "Pet-friendly", "Smoking allowed", "Non-smoking", "EV charger", "Free parking", "Private parking"] },
];

// Legacy → canonical alias map (keeps older saved values displaying under the right group)
const AMENITY_ALIASES: Record<string, string> = {
  "AC": "Air conditioning",
};

function canonicalize(amenities: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of amenities) {
    const c = AMENITY_ALIASES[a] ?? a;
    if (!seen.has(c)) { seen.add(c); out.push(c); }
  }
  return out;
}

function groupAmenities(rawAmenities: string[]): { label: string; items: string[] }[] {
  const amenities = canonicalize(rawAmenities);
  const set = new Set(amenities);
  const used = new Set<string>();
  const groups = AMENITY_GROUPS.map(g => {
    const items = g.items.filter(i => set.has(i));
    items.forEach(i => used.add(i));
    return { label: g.label, items };
  }).filter(g => g.items.length > 0);
  const other = amenities.filter(a => !used.has(a));
  if (other.length) groups.push({ label: "Other", items: other });
  return groups;
}

const HINTS_KEY = "lodging.gallery.hintsSeen";

export function LodgingRoomDetailsModal({
  open, onOpenChange, name, type, beds, maxGuests, sizeSqm, baseRateCents,
  originalRateCents, description, amenities = [], breakfastIncluded, photos = [], coverIndex = 0,
  addons = [], cancellationPolicy, checkInTime, checkOutTime, onReserve,
}: Props) {
  const { format } = useCurrency();
  // Strip Postgres seconds suffix from time strings e.g. "14:00:00" → "14:00"
  const fmtTime = (t?: string | null) => t ? t.slice(0, 5) : t;

  // Reorder so cover is first
  const orderedPhotos = photos.length > 0
    ? [photos[coverIndex] ?? photos[0], ...photos.filter((_, i) => i !== (coverIndex ?? 0))]
    : [];
  const total = orderedPhotos.length;

  const [api, setApi] = useState<CarouselApi>();
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState(false);
  const [edgePulse, setEdgePulse] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const zoomedRef = useRef(false);

  // Sync embla → idx
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIdx(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  // Reset state when modal re-opens or photos change
  useEffect(() => {
    if (open) {
      setIdx(0);
      api?.scrollTo(0, true);
    }
  }, [open, api, total]);

  // First-open hint pill
  useEffect(() => {
    if (!open || total <= 1) return;
    try {
      if (!sessionStorage.getItem(HINTS_KEY)) {
        setShowHint(true);
        sessionStorage.setItem(HINTS_KEY, "1");
        const t = setTimeout(() => setShowHint(false), 2200);
        return () => clearTimeout(t);
      }
    } catch { /* sessionStorage unavailable */ }
  }, [open, total]);

  // Edge chevrons pulse for first 3s
  useEffect(() => {
    if (!open) return;
    setEdgePulse(true);
    const t = setTimeout(() => setEdgePulse(false), 3000);
    return () => clearTimeout(t);
  }, [open]);

  // Keyboard nav while modal is open (lightbox handles its own keys when open)
  useEffect(() => {
    if (!open || lightboxOpen || !api || total <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); api.scrollPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); api.scrollNext(); }
      else if (e.key === "Home") { e.preventDefault(); api.scrollTo(0); }
      else if (e.key === "End") { e.preventDefault(); api.scrollTo(total - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lightboxOpen, api, total]);

  const handleReserve = useCallback(() => {
    onReserve();
    requestAnimationFrame(() => onOpenChange(false));
  }, [onReserve, onOpenChange]);

  const handleZoomChange = useCallback((slideIdx: number, scale: number) => {
    if (slideIdx !== idx) return;
    const isZoomed = scale > 1.05;
    if (isZoomed === zoomedRef.current) return;
    zoomedRef.current = isZoomed;
    // Toggle Embla drag without full reInit
    api?.reInit({ watchDrag: !isZoomed, loop: total > 1 });
  }, [api, idx, total]);

  const openLightbox = useCallback(() => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  }, [idx]);

  const handleLightboxClose = useCallback((v: boolean) => {
    setLightboxOpen(v);
    if (!v) {
      // Sync modal carousel back to lightbox's last index
      requestAnimationFrame(() => api?.scrollTo(lightboxIdx, true));
    }
  }, [api, lightboxIdx]);

  const currentCaption = inferCaptionFromUrl(orderedPhotos[idx]);
  const hasOriginalRate = !!originalRateCents && originalRateCents > baseRateCents;
  const originalRate = hasOriginalRate ? originalRateCents / 100 : null;
  const baseRate = baseRateCents / 100;
  const discountPct = originalRate ? Math.round(((originalRate - baseRate) / originalRate) * 100) : 0;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={name}
      description={type || undefined}
      className="sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl"
      footer={
        <div className="flex items-end justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">From</p>
            {originalRate ? (
              <div className="mt-0.5 space-y-0.5">
                <p className="text-[10px] sm:text-xs text-muted-foreground line-through">
                  {format(originalRate, "USD")}
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 leading-none">
                  {format(baseRate, "USD")}
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground"> /night</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Save {discountPct}% · Taxes calculated at booking
                </p>
              </div>
            ) : (
              <>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground leading-none mt-0.5">
                  {format(baseRate, "USD")}
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground"> /night</span>
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Taxes calculated at booking</p>
              </>
            )}
          </div>
            {originalRate && discountPct > 0 && (
              <span className="rounded-full bg-rose-500 text-white text-[11px] font-extrabold px-2.5 py-1 shrink-0">-{discountPct}%</span>
            )}
          <Button
            onClick={handleReserve}
            size="lg"
            className="font-bold rounded-full px-6 sm:px-8 h-12 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25 shrink-0"
            aria-label={`Reserve ${name}`}
            data-testid="reserve-from-details"
          >
            Reserve
          </Button>
        </div>
      }
    >
      <div className="md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-5 lg:gap-6 md:items-start space-y-4 sm:space-y-5 md:space-y-0">
        <div className="md:sticky md:top-0 md:self-start space-y-4 sm:space-y-5">
        {/* Photo carousel */}
        <div
          className="relative -mx-1 focus-visible:outline-none"
          tabIndex={0}
          role="region"
          aria-roledescription="carousel"
          aria-label={`${name} photos`}
        >
          {total > 0 ? (
            <Carousel opts={{ loop: total > 1, duration: 28 }} setApi={setApi} className="w-full">
              <CarouselContent>
                {orderedPhotos.map((src, i) => {
                  const lqip = getLqipUrl(src);
                  const isLoaded = !!loaded[i];
                  const isErrored = !!errored[i];
                  return (
                    <CarouselItem key={`${src}-${i}`}>
                      <div className="aspect-[4/3] sm:aspect-[16/10] md:aspect-[4/3] max-h-[42vh] sm:max-h-[50vh] md:max-h-[55vh] lg:max-h-[58vh] rounded-2xl overflow-hidden bg-muted/60 relative ring-1 ring-black/5 shadow-sm">
                        {/* LQIP / skeleton layer */}
                        {!isLoaded && !isErrored && (
                          lqip ? (
                            <img
                              src={lqip}
	                              alt=""
	                              aria-hidden
	                              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-400 blur-[20px] scale-[1.05]"
	                              loading="lazy"
	                              decoding="async"
	                            />
                          ) : (
                            <Skeleton className="absolute inset-0 rounded-2xl" />
                          )
                        )}
                        {isErrored ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <BedDouble className="h-10 w-10 text-muted-foreground/40" />
                            <span className="text-xs text-muted-foreground">Image unavailable</span>
                          </div>
                        ) : (
                          <ZoomableImage
                            active={i === idx}
                            onScaleChange={(s) => handleZoomChange(i, s)}
                            resetKey={i === idx ? `active-${idx}` : `inactive-${i}`}
                            className="absolute inset-0"
                          >
                            <img
                              src={optimizeImage(src, 1024)}
                              alt={`${name} photo ${i + 1} of ${total}`}
                              loading="lazy"
                              decoding="async"
                              draggable={false}
                              onLoad={() => setLoaded((p) => ({ ...p, [i]: true }))}
                              onError={() => setErrored((p) => ({ ...p, [i]: true }))}
                              className={`${isLoaded ? "opacity-100" : "opacity-0"} select-none max-h-full max-w-full w-auto h-auto object-contain transition-opacity duration-400`}
                            />
                          </ZoomableImage>
                        )}
                        {/* Bottom gradient for legibility of counter chip */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                        {/* Counter chip */}
                        {total > 1 && (
                          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold tabular-nums z-20 shadow-md">
                            {idx + 1} / {total}
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          ) : (
            <div className="aspect-[4/3] sm:aspect-[16/10] md:aspect-[4/3] max-h-[42vh] sm:max-h-[50vh] md:max-h-[55vh] lg:max-h-[58vh] rounded-2xl overflow-hidden bg-muted/60 flex flex-col items-center justify-center gap-2">
              <BedDouble className="h-10 w-10 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground">Photo coming soon</span>
            </div>
          )}

          {total > 0 && (
            <button
              type="button"
              onClick={openLightbox}
              aria-label="Open full-screen photo viewer"
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-background/95 backdrop-blur-md shadow-md ring-1 ring-black/5 z-10 hover:bg-background transition text-[11px] font-semibold text-foreground touch-manipulation"
            >
              <Expand className="h-3.5 w-3.5" />
              {total > 1 ? `View all ${total}` : "View photo"}
            </button>
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => api?.scrollPrev()}
                aria-label="Previous photo"
                className={`absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center shadow-md ring-1 ring-black/5 z-10 transition-opacity ${edgePulse ? "opacity-100 animate-pulse" : "opacity-40 hover:opacity-100"}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => api?.scrollNext()}
                aria-label="Next photo"
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/90 backdrop-blur-md flex items-center justify-center shadow-md ring-1 ring-black/5 z-10 transition-opacity ${edgePulse ? "opacity-100 animate-pulse" : "opacity-40 hover:opacity-100"}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                {orderedPhotos.map((_, i) => (
                  <button type="button"
                    key={i}
                    aria-label={`Go to photo ${i + 1}`}
                    onClick={() => api?.scrollTo(i)}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-1.5 bg-white/60 hover:bg-white/80"}`}
                  />
                ))}
              </div>
              {showHint && (
                <div className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-medium z-10 animate-fade-in">
                  ← → arrows · swipe to browse
                </div>
              )}
            </>
          )}
        </div>

        {/* Caption strip */}
        {total > 0 && currentCaption && (
          <div className="-mt-3 px-1 text-[11px] text-muted-foreground italic truncate">
            {currentCaption}
          </div>
        )}
        </div>

        <div className="space-y-4 sm:space-y-5">
        {/* Premium stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
          {beds && (
            <div className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-border bg-secondary">
              <BedDouble className="h-4 w-4 text-foreground dark:text-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Beds</span>
              <span className="text-xs font-bold text-foreground leading-tight">{beds}</span>
            </div>
          )}
          <div className="flex flex-col items-start gap-1 p-2.5 rounded-xl border border-border bg-secondary">
            <Users className="h-4 w-4 text-foreground dark:text-foreground" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sleeps</span>
            <span className="text-xs font-bold text-foreground leading-tight">{maxGuests} guests</span>
          </div>
          {sizeSqm != null && (
            <div className="flex flex-col items-start gap-1 p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-800/40">
              <Maximize2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Size</span>
              <span className="text-xs font-bold text-foreground leading-tight">{sizeSqm} m²</span>
            </div>
          )}
          {breakfastIncluded && (
            <div className="flex flex-col items-start gap-1 p-2.5 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-800/40">
              <Coffee className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Included</span>
              <span className="text-xs font-bold text-foreground leading-tight">Breakfast</span>
            </div>
          )}
        </div>

        {/* Description */}
        {description && (
          <div>
            <h3 className="text-sm font-bold mb-1.5 flex items-center gap-1.5">
              <span className="h-3.5 w-1 rounded-full bg-emerald-500" />
              About this room
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{description}</p>
          </div>
        )}

        {/* Amenities — grouped Booking.com-style */}
        {amenities.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <span className="h-3.5 w-1 rounded-full bg-foreground" />
              Amenities
            </h3>
            <div className="space-y-3">
              {groupAmenities(amenities).map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold text-foreground mb-1.5">{group.label}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
                    {group.items.map((a) => {
                      const Icon = getAmenityIcon(a);
                      return (
                        <div key={a} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50 text-xs text-foreground">
                          <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{a}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons */}
        {addons.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
              <span className="h-3.5 w-1 rounded-full bg-amber-500" />
              <Plus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Available extras
            </h3>
            <div className="space-y-1.5">
              {addons.map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/40 to-muted/20 border border-border/60 hover:border-amber-300/60 transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground truncate">{a.name || "Untitled"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{PER_LABEL[a.per]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      +{format(a.price_cents / 100, "USD")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Optional — choose during booking. Prices shown per the property's policy.
            </p>
          </div>
        )}

        {/* Policies */}
        <div>
          <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
            <span className="h-3.5 w-1 rounded-full bg-foreground" />
            <ShieldCheck className="h-3.5 w-3.5 text-foreground dark:text-foreground" /> Policies
          </h3>
          <div className="rounded-xl bg-muted/30 border border-border/60 p-3 space-y-2 text-xs text-muted-foreground">
            {cancellationPolicy && (
              <p className="leading-relaxed">
                <span className="font-semibold text-foreground">Cancellation: </span>
                {POLICY_LABELS[cancellationPolicy] ?? cancellationPolicy}
              </p>
            )}
            {(checkInTime || checkOutTime) && (
              <p className="flex items-start gap-1.5">
                <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  {checkInTime && <>Check-in from <span className="font-semibold text-foreground">{fmtTime(checkInTime)}</span></>}
                  {checkInTime && checkOutTime && " · "}
                  {checkOutTime && <>Check-out by <span className="font-semibold text-foreground">{fmtTime(checkOutTime)}</span></>}
                </span>
              </p>
            )}
            {breakfastIncluded && (
              <p className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Breakfast is included with your stay.
              </p>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Full-screen lightbox */}
      <LodgingPhotoLightbox
        open={lightboxOpen}
        onOpenChange={handleLightboxClose}
        photos={orderedPhotos}
        index={lightboxIdx}
        onIndexChange={setLightboxIdx}
        name={name}
      />
    </ResponsiveModal>
  );
}
