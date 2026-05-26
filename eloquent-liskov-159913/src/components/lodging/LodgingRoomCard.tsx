/**
 * LodgingRoomCard - public-facing room card on store profile.
 * Premium "magazine" style: type badge top-left, ornament divider, 2-column
 * photo grid with key info overlaid on the leading panel, clean Reserve CTA.
 * Tap card body → opens details modal. Reserve button → booking flow.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { BedDouble, ChevronRight, Coffee, Plus, CheckCircle2, Tag } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { LodgingRoomDetailsModal } from "@/components/lodging/LodgingRoomDetailsModal";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import { optimizeImage } from "@/lib/optimizeImage";
import type { LodgeAddon, BedSlot } from "@/hooks/lodging/useLodgeRooms";
import { bedConfigSummary } from "@/components/lodging/BedConfigBuilder";

interface Props {
  name: string;
  type?: string | null;
  beds?: string | null;
  bedConfig?: BedSlot[];
  maxGuests: number;
  baseRateCents: number;
  weekendRateCents?: number;
  weeklyDiscountPct?: number;
  monthlyDiscountPct?: number;
  amenities?: string[];
  breakfastIncluded?: boolean;
  imageUrl?: string;
  description?: string | null;
  addonsCount?: number;
  photos?: string[];
  coverIndex?: number;
  sizeSqm?: number | null;
  addons?: LodgeAddon[];
  cancellationPolicy?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  breakfastRateCents?: number;
  originalRateCents?: number;
  badges?: string[];
  expandableFeatures?: string[];
  onReserve: (plan: { rateCents: number; label: string; breakfastIncluded: boolean }) => void;
}

/** Tiny floral ornament divider — vector, no asset dependency */
function OrnamentDivider() {
  return (
    <div className="flex items-center justify-center gap-1.5 px-3 py-1.5">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent" />
      <svg viewBox="0 0 40 12" className="h-3 w-10 text-foreground/80" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
        <path d="M2 6 Q 8 1, 14 6 T 26 6 T 38 6" />
        <circle cx="20" cy="6" r="1.2" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent" />
    </div>
  );
}

export function LodgingRoomCard({
  name, type, beds, bedConfig, maxGuests, baseRateCents,
  weekendRateCents, weeklyDiscountPct = 0, monthlyDiscountPct = 0,
  amenities = [], breakfastIncluded, imageUrl,
  description, addonsCount = 0, photos, coverIndex, sizeSqm, addons, cancellationPolicy,
  checkInTime, checkOutTime, breakfastRateCents, originalRateCents, badges = [], expandableFeatures = [],
  onReserve,
}: Props) {
  const { format } = useCurrency();
  // Derive bed label: prefer old text field, fall back to structured bed_config
  const bedLabel = beds || (bedConfig && bedConfig.length > 0 ? bedConfigSummary(bedConfig) : null);
  // Strip Postgres seconds suffix from time strings e.g. "14:00:00" → "14:00"
  const fmtTime = (t?: string | null) => t ? t.slice(0, 5) : t;
  const [detailsOpen, setDetailsOpen] = useState(false);

  const allPhotos = photos && photos.length > 0 ? photos : (imageUrl ? [imageUrl] : []);
  const cover = allPhotos[coverIndex ?? 0] ?? allPhotos[0];
  const gridPhotos: (string | undefined)[] = [
    allPhotos[0],
    allPhotos[1],
    allPhotos[2],
    allPhotos[3],
    allPhotos[4],
    allPhotos[5],
    allPhotos[6],
    allPhotos[7],
    allPhotos[8],
  ];
  const totalAddons = addons?.length ?? addonsCount;
  const hasNoPrepayment = badges.some((badge) => /no\s+prepayment|no\s+credit\s+card/i.test(badge));
  const includedPerks = expandableFeatures.length > 0
    ? expandableFeatures.slice(0, 4).join(" + ")
    : "Parking + late check-out + early check-in + high-speed internet";
  const hasDirectDiscount = !!originalRateCents && originalRateCents > baseRateCents;

  // Quick chip amenities (icons + labels) — show first 4
  const quickChips = amenities.slice(0, 4);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden border border-border/60 bg-card shadow-[0_8px_28px_-12px_hsl(220_40%_20%/0.18)]"
      >
        {/* ── Hero: 2-col photo grid with overlaid info on the left tile ── */}
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          aria-label={`View details for ${name}`}
          className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring p-3"
        >
          <div className="grid grid-cols-[1.05fr_1fr] gap-1.5 rounded-2xl overflow-hidden">
            {/* Left big tile w/ info overlay */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-l-2xl bg-secondary">
              {type && (
                <span className="absolute top-2.5 left-2.5 z-10 inline-flex items-center rounded-lg bg-background/95 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-foreground border border-border/60 shadow-sm">
                  {type}
                </span>
              )}
              {gridPhotos[0] ? (
                <img src={optimizeImage(gridPhotos[0], 600)} alt={name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BedDouble className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}
              {/* Stronger left-anchored gradient for text legibility */}
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/30" />
              {/* Info overlay column */}
              <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
                <div className="space-y-2.5">
                  {type && (
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.14em] font-bold text-white/65 leading-none">Room type</p>
                      <p className="text-[12px] font-extrabold leading-tight mt-1 line-clamp-2 drop-shadow-md">{name}</p>
                    </div>
                  )}
                  {bedLabel && (
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.14em] font-bold text-white/65 leading-none">Beds</p>
                      <p className="text-[11px] font-bold leading-tight mt-1 drop-shadow-md">{bedLabel}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.14em] font-bold text-white/65 leading-none">Occupancy</p>
                    <p className="text-[11px] font-bold leading-tight mt-1 drop-shadow-md">{maxGuests} {maxGuests === 1 ? "guest" : "guests"}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/15 space-y-1.5">
                  <div>
                    <p className="text-[8px] uppercase tracking-[0.14em] font-bold text-white/65 leading-none">Weekday</p>
                    <p className="text-[15px] font-black leading-tight mt-0.5 drop-shadow-md tracking-tight">{format(baseRateCents / 100, "USD")}</p>
                  </div>
                  {weekendRateCents && weekendRateCents !== baseRateCents && (
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.14em] font-bold text-white/65 leading-none">Weekend</p>
                      <p className="text-[13px] font-extrabold leading-tight mt-0.5 drop-shadow-md tracking-tight">{format(weekendRateCents / 100, "USD")}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right column: 2x2 mini grid of photos */}
            <div className="grid grid-rows-2 gap-1.5">
              {[1, 2].map((row) => (
                <div key={row} className="grid grid-cols-2 gap-1.5">
                  {[gridPhotos[row * 2 - 1], gridPhotos[row * 2]].map((src, i) => {
                    const isLastTile = row === 2 && i === 1;
                    const extraCount = isLastTile && allPhotos.length > 5 ? allPhotos.length - 5 : 0;
                    return (
                      <div
                        key={i}
                        className={`relative bg-gradient-to-br from-muted to-muted/50 overflow-hidden ${row === 1 && i === 1 ? "rounded-tr-2xl" : ""} ${row === 2 && i === 1 ? "rounded-br-2xl" : ""}`}
                      >
                        {src ? (
                          <img src={optimizeImage(src, 300)} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
                        ) : cover ? (
                          <img src={optimizeImage(cover, 300)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" loading="lazy" decoding="async" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BedDouble className="h-5 w-5 text-muted-foreground/30" />
                          </div>
                        )}
                        {extraCount > 0 && (
                          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="text-white text-[13px] font-extrabold tracking-tight drop-shadow">+{extraCount}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* ── Title + chips ── */}
          <div className="px-1 pt-3 pb-1 space-y-2">
            <p className="font-extrabold text-base leading-tight tracking-tight uppercase">{name}</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
              {bedLabel && (
                <span className="flex items-center gap-1">
                  <BedDouble className="h-3 w-3" /> {bedLabel}
                </span>
              )}
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
                Sleeps {maxGuests}
              </span>
              {sizeSqm && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
                  {sizeSqm} m² · {Math.round(sizeSqm * 10.764)} ft²
                </span>
              )}
            </div>
            {(quickChips.length > 0 || breakfastIncluded || totalAddons > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {quickChips.map((a) => {
                  const Icon = getAmenityIcon(a);
                  return (
                    <span
                      key={a}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground border border-border inline-flex items-center gap-1 font-medium"
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {a.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  );
                })}
                {breakfastIncluded && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 inline-flex items-center gap-1 font-medium dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20">
                    <Coffee className="h-2.5 w-2.5" /> Breakfast
                  </span>
                )}
                {amenities.length > 4 && (
                  <span className="text-[10px] text-muted-foreground self-center">+{amenities.length - 4}</span>
                )}
                {totalAddons > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 inline-flex items-center gap-1 font-medium dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20">
                    <Plus className="h-2.5 w-2.5" /> {totalAddons} add-on{totalAddons > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </button>

        {/* ── Rate plan options — each row is its own Reserve CTA ── */}
        <div className="px-4 pb-1 pt-2 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 hover:underline"
            >
              View details <ChevronRight className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-muted-foreground font-medium">Your options</span>
          </div>

          {/* Option 1: Room Only */}
          {(() => {
            const price = baseRateCents / 100;
            const original = hasDirectDiscount ? (originalRateCents ?? 0) / 100 : null;
            const discountPct = original ? Math.round(((original - price) / original) * 100) : 0;
            const hasGetaway = badges.includes("Getaway Deal") && !!originalRateCents;
            return (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground">Room Only</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                      Free cancellation · {hasNoPrepayment ? "No prepayment" : "Pay in advance"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {hasGetaway && original && (
                      <p className="text-[10px] text-red-500 line-through leading-none">{format(original, "USD")}</p>
                    )}
                    <p className="text-[15px] font-extrabold text-foreground leading-tight">{format(price, "USD")}</p>
                    <p className="text-[9px] text-muted-foreground">/night</p>
                  </div>
                </div>
                {original && discountPct > 0 && (
                  <div className="flex gap-1 mb-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">{discountPct}% off</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold flex items-center gap-0.5">
                      <Tag className="h-2 w-2" /> Getaway Deal
                    </span>
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[12px]"
                  onClick={() => onReserve({ rateCents: baseRateCents, label: "Room Only", breakfastIncluded: false })}
                >
                  Reserve · {format(price, "USD")}/night
                </Button>
              </div>
            );
          })()}

          {/* Option 2: Breakfast Included */}
          {breakfastRateCents && (() => {
            const bfPrice = breakfastRateCents / 100;
            const hasGetaway = badges.includes("Getaway Deal") && originalRateCents;
            const bfOriginal = hasGetaway && originalRateCents ? Math.round(originalRateCents / 100 * (breakfastRateCents / baseRateCents)) : null;
            const discountPct = bfOriginal ? Math.round(((bfOriginal - bfPrice) / bfOriginal) * 100) : 0;
            return (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-500/5 p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <Coffee className="h-3 w-3 text-amber-500" /> Breakfast Included
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                      {includedPerks}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500 shrink-0" />
                      Free cancellation · No prepayment
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {bfOriginal && (
                      <p className="text-[10px] text-red-500 line-through leading-none">{format(bfOriginal, "USD")}</p>
                    )}
                    <p className="text-[15px] font-extrabold text-foreground leading-tight">{format(bfPrice, "USD")}</p>
                    <p className="text-[9px] text-muted-foreground">/night</p>
                  </div>
                </div>
                {hasGetaway && discountPct > 0 && (
                  <div className="flex gap-1 mb-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold">{discountPct}% off</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-bold flex items-center gap-0.5">
                      <Tag className="h-2 w-2" /> Getaway Deal
                    </span>
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full h-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-[12px]"
                  onClick={() => onReserve({ rateCents: breakfastRateCents, label: "Breakfast Included", breakfastIncluded: true })}
                >
                  Reserve · {format(bfPrice, "USD")}/night
                </Button>
              </div>
            );
          })()}
        </div>

        <div className="px-4 pb-4 pt-1">
          {(weeklyDiscountPct > 0 || monthlyDiscountPct > 0) && (
            <p className="text-[10px] text-muted-foreground text-center leading-tight">
              {weeklyDiscountPct > 0 && <>−{weeklyDiscountPct}% for 7+ nights</>}
              {weeklyDiscountPct > 0 && monthlyDiscountPct > 0 && " · "}
              {monthlyDiscountPct > 0 && <>−{monthlyDiscountPct}% for 28+ nights</>}
            </p>
          )}
        </div>
      </motion.div>

      <LodgingRoomDetailsModal
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        name={name}
        type={type}
        beds={bedLabel}
        maxGuests={maxGuests}
        sizeSqm={sizeSqm}
        baseRateCents={baseRateCents}
        originalRateCents={originalRateCents}
        description={description}
        amenities={amenities}
        breakfastIncluded={breakfastIncluded}
        photos={photos}
        coverIndex={coverIndex}
        addons={addons}
        cancellationPolicy={cancellationPolicy}
        checkInTime={fmtTime(checkInTime)}
        checkOutTime={fmtTime(checkOutTime)}
        onReserve={() => onReserve({ rateCents: baseRateCents, label: "Room Only", breakfastIncluded: false })}
      />
    </>
  );
}
