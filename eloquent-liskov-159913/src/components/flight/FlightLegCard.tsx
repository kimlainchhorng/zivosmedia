/**
 * FlightLegCard — 3D Spatial UI for step-by-step flight selection
 */

import { useState, useMemo } from "react";
import { getAllInPrice } from "@/utils/flightPricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock, ChevronRight, ChevronDown, Briefcase, ArrowRight, Repeat, Plane, RefreshCw, Luggage, PackageCheck, CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type DuffelOffer, type DuffelSegment } from "@/hooks/useDuffelFlights";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import { cn } from "@/lib/utils";

export interface LegGroup {
  fingerprint: string;
  representativeOffer: DuffelOffer;
  offers: DuffelOffer[];
  segments: DuffelSegment[];
  summary: LegSummary;
  fromPrice: number;
  fareCount: number;
}

export interface LegSummary {
  depTime: string;
  arrTime: string;
  depCode: string;
  arrCode: string;
  duration: string;
  stops: number;
  stopDetails: { code: string; city: string; layoverDuration: string }[];
  dayDiff: number;
}

interface FlightLegCardProps {
  group: LegGroup;
  index: number;
  sortBy: string;
  isLowest: boolean;
  isFastest: boolean;
  label: "outbound" | "return";
  onSelect: (group: LegGroup) => void;
}

const sortBadgeConfig: Record<string, { label: string; className: string }> = {
  best: { label: "✨ Best Option", className: "bg-[hsl(var(--flights)/0.1)] text-[hsl(var(--flights))] border-[hsl(var(--flights)/0.25)]" },
  cheapest: { label: "🔥 Cheapest", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
  fastest: { label: "⚡ Fastest", className: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25" },
};

function SegmentRow({ seg, isLast }: { seg: DuffelSegment; isLast: boolean }) {
  return (
    <div className="relative pl-5">
      <div className="absolute left-1.5 top-0 bottom-0 flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--flights))] border-2 border-card shrink-0 mt-1" style={{ boxShadow: "0 0 6px hsl(var(--flights)/0.3)" }} />
        {!isLast && <div className="flex-1 w-px bg-[hsl(var(--flights)/0.2)] my-0.5" />}
      </div>
      <div className="pb-3">
        <div className="flex items-center gap-2 mb-1">
          <AirlineLogo
            iataCode={seg.operatingCarrierCode || seg.marketingCarrierCode}
            airlineName={seg.operatingCarrier || seg.marketingCarrier}
            size={22}
            className="shrink-0"
          />
          <span className="text-[10px] font-semibold truncate">
            {seg.marketingCarrier} · {seg.flightNumber}
          </span>
          {seg.aircraft && (
            <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{seg.aircraft}</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="min-w-0">
            <p className="font-bold tabular-nums">{seg.departingAt?.split("T")[1]?.slice(0, 5) || "—"}</p>
            <p className="text-muted-foreground text-[9px]">{seg.origin.code} {seg.origin.terminal ? `T${seg.origin.terminal}` : ""}</p>
          </div>
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-[8px] text-muted-foreground whitespace-nowrap">{seg.duration}</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <div className="text-right min-w-0">
            <p className="font-bold tabular-nums">{seg.arrivingAt?.split("T")[1]?.slice(0, 5) || "—"}</p>
            <p className="text-muted-foreground text-[9px]">{seg.destination.code} {seg.destination.terminal ? `T${seg.destination.terminal}` : ""}</p>
          </div>
        </div>
        {seg.operatingCarrierCode !== seg.marketingCarrierCode && (
          <p className="text-[8px] text-muted-foreground/70 mt-0.5 flex items-center gap-0.5">
            <Repeat className="w-2 h-2" /> Operated by {seg.operatingCarrier}
          </p>
        )}
      </div>
    </div>
  );
}

export default function FlightLegCard({
  group,
  index,
  sortBy,
  isLowest,
  isFastest,
  label,
  onSelect,
}: FlightLegCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isTop = index === 0;
  const badge = isTop ? sortBadgeConfig[sortBy] : null;
  const { summary, segments, representativeOffer, fromPrice, fareCount } = group;

  const carrierCodes = useMemo(() => {
    const codes = new Set<string>();
    segments.forEach(seg => {
      codes.add(seg.marketingCarrierCode);
      if (seg.operatingCarrierCode) codes.add(seg.operatingCarrierCode);
    });
    return [...codes].slice(0, 2);
  }, [segments]);

  const airlineName = segments[0]?.marketingCarrier || representativeOffer.airline;
  const flightNumbers = segments.map(s => s.flightNumber).join(" · ");
  const stopLabel = summary.stops === 0 ? "Nonstop" : `${summary.stops} stop${summary.stops > 1 ? "s" : ""}`;

  const bag = representativeOffer.baggageDetails;
  const weightLabel = (kg: number | null, lb: number | null) => {
    if (kg && lb) return `${kg}kg · ${lb}lb`;
    if (kg) return `${kg}kg`;
    if (lb) return `${lb}lb`;
    return null;
  };
  const checkedWeight = bag ? weightLabel(bag.checkedBagWeightKg, bag.checkedBagWeightLb) : null;
  const carryOnWeight = bag ? weightLabel(bag.carryOnWeightKg, bag.carryOnWeightLb) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3), ease: [0.16, 1, 0.3, 1] }}
      className={cn("rounded-2xl group overflow-hidden", isTop ? "ring-1 ring-[hsl(var(--flights)/0.2)]" : "")}
      style={{
        background: "hsl(var(--card))",
        boxShadow: isTop
          ? `0 1px 0 0 hsl(var(--flights)/0.05),
             0 6px 24px -6px hsl(var(--foreground)/0.08),
             0 16px 48px -12px hsl(var(--foreground)/0.05),
             inset 0 1px 0 0 hsl(0 0% 100%/0.06)`
          : `0 1px 0 0 hsl(var(--border)/0.08),
             0 3px 12px -3px hsl(var(--foreground)/0.05),
             0 8px 28px -8px hsl(var(--foreground)/0.03),
             inset 0 1px 0 0 hsl(0 0% 100%/0.05)`,
      }}
    >
      {/* Badge strip */}
      {(isTop || isLowest || isFastest) && (
        <div className="flex gap-1.5 px-4 pt-3">
          {badge && (
            <Badge
              className={cn("text-[9px] font-bold px-2.5 py-0.5 border rounded-lg", badge.className)}
              style={{ boxShadow: "0 1px 4px -1px hsl(var(--foreground)/0.06)" }}
            >
              {badge.label}
            </Badge>
          )}
          {isLowest && !isTop && (
            <Badge className="text-[9px] font-bold px-2.5 py-0.5 border rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" style={{ boxShadow: "0 1px 4px -1px hsl(var(--foreground)/0.06)" }}>
              🔥 Cheapest
            </Badge>
          )}
          {isFastest && !isTop && (
            <Badge className="text-[9px] font-bold px-2.5 py-0.5 border rounded-lg bg-secondary text-foreground dark:text-foreground border-border" style={{ boxShadow: "0 1px 4px -1px hsl(var(--foreground)/0.06)" }}>
              ⚡ Fastest
            </Badge>
          )}
        </div>
      )}

      <div className="px-4 py-3">
        {/* Airline + Price */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="relative shrink-0 rounded-xl overflow-hidden"
              style={{
                width: carrierCodes.length > 1 ? 54 : 44,
                height: 44,
              }}
            >
              <AirlineLogo
                iataCode={carrierCodes[0]}
                airlineName={airlineName}
                size={44}
                className="border border-border/15 bg-card/80 shadow-md"
              />
              {carrierCodes.length > 1 && (
                <AirlineLogo iataCode={carrierCodes[1]} airlineName="" size={28} className="absolute bottom-0 right-0 border-2 border-card bg-card shadow-sm" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight truncate">{airlineName}</p>
              <p className="text-[10px] text-muted-foreground/70 leading-tight">{flightNumbers}</p>
            </div>
          </div>

          <div
            className="text-right shrink-0 px-3 py-1.5 rounded-xl"
            style={{
              background: "hsl(var(--flights)/0.04)",
              boxShadow: "inset 0 1px 0 0 hsl(0 0% 100%/0.04), 0 1px 3px -1px hsl(var(--flights)/0.06)",
            }}
          >
            <p className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">from</p>
            <p className="text-xl font-extrabold text-[hsl(var(--flights))] tabular-nums leading-none tracking-tight">
              ${Math.round(getAllInPrice(fromPrice))}
            </p>
            {fareCount > 1 && (
              <p className="text-[8px] text-muted-foreground mt-0.5">{fareCount} fare options</p>
            )}
          </div>
        </div>

        {/* Route timeline */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{
            background: "hsl(var(--muted)/0.3)",
            boxShadow: "inset 0 1px 2px 0 hsl(var(--foreground)/0.03)",
          }}
        >
          <div className="text-left shrink-0 min-w-[50px]">
            <p className="text-lg font-extrabold tabular-nums leading-none">{summary.depTime}</p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">{summary.depCode}</p>
          </div>

          <div className="flex flex-col items-center flex-1 py-0.5 min-w-0">
            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-0.5 whitespace-nowrap">
              <Clock className="w-2.5 h-2.5 shrink-0 opacity-60" />
              {summary.duration}
            </span>
            <div className="w-full h-[3px] from-[hsl(var(--flights))] via-[hsl(var(--flights)/0.3)] to-[hsl(var(--flights))] relative my-1.5 rounded-full bg-secondary"
              style={{ boxShadow: "0 1px 4px -1px hsl(var(--flights)/0.2)" }}
            >
              {/* Departure dot */}
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[hsl(var(--flights))] border-2 border-card"
                style={{ boxShadow: "0 0 6px hsl(var(--flights)/0.3)" }}
              />
              {/* Stop dots */}
              {summary.stopDetails.map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2"
                  style={{ left: `${((i + 1) / (summary.stopDetails.length + 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className="w-[7px] h-[7px] rounded-full bg-amber-500 border-[1.5px] border-card" style={{ boxShadow: "0 0 4px hsl(38 92% 50%/0.3)" }} />
                </div>
              ))}
              {/* Plane icon on the line */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <Plane className="w-3 h-3 text-[hsl(var(--flights))] -rotate-45 drop-shadow-sm" />
              </div>
              {/* Arrival dot */}
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[hsl(var(--flights))] border-2 border-card"
                style={{ boxShadow: "0 0 6px hsl(var(--flights)/0.3)" }}
              />
            </div>
            <span className={cn(
              "text-[9px] font-bold leading-tight",
              summary.stops === 0 ? "text-[hsl(var(--flights))]" : "text-amber-600 dark:text-amber-400"
            )}>
              {stopLabel}
            </span>
            {summary.stopDetails.length > 0 && (
              <span className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5 mt-0.5 truncate max-w-full">
                {summary.stopDetails.map((s, i) => (
                  <span key={i} className="flex items-center gap-0.5">
                    {i > 0 && <ArrowRight className="w-1.5 h-1.5 shrink-0" />}
                    <span>{s.code}</span>
                    {s.layoverDuration && <span className="opacity-50">({s.layoverDuration})</span>}
                  </span>
                ))}
              </span>
            )}
          </div>

          <div className="text-right shrink-0 min-w-[50px]">
            <p className="text-lg font-extrabold tabular-nums leading-none">
              {summary.arrTime}
              {summary.dayDiff > 0 && (
                <sup className="text-[9px] font-bold text-amber-500 ml-0.5">+{summary.dayDiff}</sup>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">{summary.arrCode}</p>
          </div>
        </div>

        {/* Baggage amenities */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Personal item */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/6 border border-emerald-500/15"
            style={{ boxShadow: "0 1px 3px -1px hsl(142 71% 45%/0.08), inset 0 1px 0 0 hsl(0 0% 100%/0.04)" }}
          >
            <div className="relative shrink-0">
              <Briefcase style={{ width: 14, height: 14 }} className="text-emerald-600 dark:text-emerald-400" />
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 absolute -bottom-0.5 -right-1.5 bg-card rounded-full" />
            </div>
            <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">Personal item</span>
          </div>

          {/* Carry-on */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border",
              bag?.carryOnIncluded
                ? "bg-emerald-500/6 border-emerald-500/15"
                : "bg-muted/20 border-border/15 opacity-45"
            )}
            style={bag?.carryOnIncluded ? { boxShadow: "0 1px 3px -1px hsl(142 71% 45%/0.08), inset 0 1px 0 0 hsl(0 0% 100%/0.04)" } : { boxShadow: "inset 0 1px 2px 0 hsl(var(--foreground)/0.02)" }}
          >
            <div className="relative shrink-0">
              <PackageCheck style={{ width: 14, height: 14 }} className={bag?.carryOnIncluded ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"} />
              {bag?.carryOnIncluded && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 absolute -bottom-0.5 -right-1.5 bg-card rounded-full" />}
            </div>
            <div className="flex flex-col leading-none">
              <span className={cn("text-[9px] font-semibold", bag?.carryOnIncluded ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                Carry-on{bag?.carryOnQuantity && bag.carryOnQuantity > 1 ? ` ×${bag.carryOnQuantity}` : ""}
              </span>
              {bag?.carryOnIncluded && carryOnWeight && (
                <span className="text-[7.5px] text-muted-foreground/70 mt-0.5">{carryOnWeight}</span>
              )}
            </div>
          </div>

          {/* Checked bag */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border",
              bag?.checkedBagsIncluded
                ? "bg-emerald-500/6 border-emerald-500/15"
                : "bg-muted/20 border-border/15 opacity-45"
            )}
            style={bag?.checkedBagsIncluded ? { boxShadow: "0 1px 3px -1px hsl(142 71% 45%/0.08), inset 0 1px 0 0 hsl(0 0% 100%/0.04)" } : { boxShadow: "inset 0 1px 2px 0 hsl(var(--foreground)/0.02)" }}
          >
            <div className="relative shrink-0">
              <Luggage style={{ width: 14, height: 14 }} className={bag?.checkedBagsIncluded ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"} />
              {bag?.checkedBagsIncluded && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 absolute -bottom-0.5 -right-1.5 bg-card rounded-full" />}
            </div>
            <div className="flex flex-col leading-none">
              <span className={cn("text-[9px] font-semibold", bag?.checkedBagsIncluded ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                {bag?.checkedBagsIncluded ? `Checked ×${bag.checkedBagQuantity}` : "No checked bag"}
              </span>
              {bag?.checkedBagsIncluded && checkedWeight && (
                <span className="text-[7.5px] text-muted-foreground/70 mt-0.5">{checkedWeight}</span>
              )}
            </div>
          </div>

          {/* Refundable */}
          {representativeOffer.isRefundable && (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/6 border border-emerald-500/15"
              style={{ boxShadow: "0 1px 3px -1px hsl(142 71% 45%/0.08), inset 0 1px 0 0 hsl(0 0% 100%/0.04)" }}
            >
              <RefreshCw style={{ width: 12, height: 12 }} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-300">Refundable</span>
            </div>
          )}

          {/* Seat selection indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border bg-muted/20 border-border/15 opacity-45"
            style={{ boxShadow: "inset 0 1px 2px 0 hsl(var(--foreground)/0.02)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" className="text-muted-foreground shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v2a1 1 0 0 0 1 1h1" />
              <path d="M10 6l-2 6" />
              <path d="M8 12h9" />
              <path d="M8 12v4h9" />
              <path d="M17 12v4" />
              <path d="M12 16v4" />
            </svg>
            <span className="text-[9px] font-semibold text-muted-foreground">No seat selection</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between mt-3.5">
          <p className="text-[10px] text-muted-foreground/60 capitalize font-medium">{label} flight</p>
          <Button
            size="sm"
            className={cn(
              "h-10 px-6 text-[12px] font-bold active:scale-[0.97] transition-all gap-1.5 shrink-0 rounded-xl",
              "bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 text-primary-foreground"
            )}
            style={{
              boxShadow: `0 3px 12px -3px hsl(var(--flights)/0.35),
                           0 1px 3px 0 hsl(var(--flights)/0.15),
                           inset 0 1px 0 0 hsl(0 0% 100%/0.12)`,
            }}
            onClick={(e) => { e.stopPropagation(); onSelect(group); }}
          >
            Select {label === "outbound" ? "Departure" : "Return"}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Expand toggle */}
        {segments.length > 0 && (
          <button type="button"
            onClick={() => setExpanded(prev => !prev)}
            className="w-full flex items-center justify-center gap-1 mt-3 pt-2.5 border-t border-border/15 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Hide details" : "Flight details"}
          </button>
        )}
      </div>

      {/* Expandable segment details */}
      <AnimatePresence>
        {expanded && segments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-3 pt-2 border-t border-border/15 space-y-2"
              style={{ background: "hsl(var(--muted)/0.15)" }}
            >
              {segments.map((seg, i) => (
                <SegmentRow key={seg.id || i} seg={seg} isLast={i === segments.length - 1} />
              ))}
              {summary.stopDetails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {summary.stopDetails.map((stop, i) => (
                    <Badge key={i} variant="outline" className="text-[8px] border-amber-500/20 bg-amber-500/5 text-amber-600 h-[18px] px-1.5 gap-0.5">
                      <Clock className="w-2 h-2" /> {stop.layoverDuration} layover in {stop.city || stop.code}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}