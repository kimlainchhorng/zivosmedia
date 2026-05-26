/**
 * DuffelFlightCard — Premium OTA-style flight result card
 * Shows outbound + return legs for round-trip searches
 * With expandable segment details drawer + 3D tilt effect
 */

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock, ChevronRight, ChevronDown, Briefcase, ShieldCheck, ShieldX,
  ArrowRight, Repeat, Plane, ExternalLink, RefreshCw, Scale
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type DuffelOffer, type DuffelSegment } from "@/hooks/useDuffelFlights";
import { type CompareFlight } from "@/components/flight/FlightCompareWidget";
import { getAllInPrice } from "@/utils/flightPricing";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import SeatMapPreview from "@/components/flight/SeatMapPreview";
import BoardingPass3D from "@/components/flight/BoardingPass3D";
import { use3DTilt } from "@/hooks/use3DTilt";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface DuffelFlightCardProps {
  offer: DuffelOffer;
  index: number;
  sortBy: string;
  isLowest: boolean;
  isFastest: boolean;
  totalPassengers: number;
  hasReturn: boolean;
  onSelect: (offer: DuffelOffer) => void;
  searchDestination?: string;
  onCompare?: (flight: CompareFlight) => void;
  inCompare?: boolean;
}

const sortBadgeConfig: Record<string, { label: string; className: string }> = {
  best: { label: "✨ Best Option", className: "bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border-[hsl(var(--flights))]/25" },
  cheapest: { label: "💰 Cheapest", className: "bg-primary/10 text-primary border-primary/25" },
  fastest: { label: "⚡ Fastest", className: "bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border-[hsl(var(--flights))]/25" },
  earliest: { label: "🕐 Earliest", className: "bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border-[hsl(var(--flights))]/25" },
  shortest: { label: "📏 Shortest", className: "bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border-[hsl(var(--flights))]/25" },
};

/* ── Segment detail row ── */
function SegmentRow({ seg, isLast }: { seg: DuffelSegment; isLast: boolean }) {
  return (
    <div className="relative pl-5">
      {/* Timeline dot + line */}
      <div className="absolute left-1.5 top-0 bottom-0 flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-[hsl(var(--flights))] border border-card shrink-0 mt-1" />
        {!isLast && <div className="flex-1 w-px bg-border/40 my-0.5" />}
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
            <Repeat className="w-2 h-2" />
            Operated by {seg.operatingCarrier}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Route timeline (reusable for outbound/return) ── */
function RouteTimeline({
  depTime,
  depCode,
  arrTime,
  arrCode,
  duration,
  stops,
  stopDetails,
  label,
  dayDiff,
}: {
  depTime: string;
  depCode: string;
  arrTime: string;
  arrCode: string;
  duration: string;
  stops: number;
  stopDetails?: { code: string; city: string; layoverDuration: string }[];
  label?: string;
  dayDiff?: number;
}) {
  const stopLabel = stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`;

  return (
    <div>
      {label && (
        <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      )}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="text-left shrink-0 min-w-[52px] sm:min-w-[58px]">
          <p className="text-[19px] sm:text-xl font-bold tabular-nums leading-none">{depTime}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5">{depCode}</p>
        </div>

        <div className="flex flex-col items-center flex-1 py-0.5 min-w-0">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground font-medium flex items-center gap-0.5 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            {duration}
          </span>

          <div className="w-full h-[2px] bg-gradient-to-r from-[hsl(var(--flights))] via-border/50 to-[hsl(var(--flights))] relative my-1 rounded-full">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[hsl(var(--flights))] border-[1.5px] border-card" />
            {stopDetails && stopDetails.length > 0
              ? stopDetails.map((stop, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: `${((i + 1) / (stopDetails.length + 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="w-[6px] h-[6px] rounded-full bg-muted-foreground/60 border border-card" />
                  </div>
                ))
              : stops > 0 && Array.from({ length: Math.min(stops, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-muted-foreground/60 border border-card"
                    style={{ left: `${((i + 1) / (Math.min(stops, 3) + 1)) * 100}%` }}
                  />
                ))
            }
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full bg-[hsl(var(--flights))] border-[1.5px] border-card" />
          </div>

          <span className={cn(
            "text-[9px] sm:text-[10px] font-semibold leading-tight",
            stops === 0 ? "text-primary" : "text-muted-foreground"
          )}>
            {stopLabel}
          </span>
          {stopDetails && stopDetails.length > 0 && (
            <span className="text-[8px] text-muted-foreground/70 flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {stopDetails.map((s, i) => (
                <span key={i} className="flex items-center gap-0.5">
                  {i > 0 && <ArrowRight className="w-1.5 h-1.5 shrink-0" />}
                  <span>{s.code}</span>
                  {s.layoverDuration && (
                    <span className="text-muted-foreground/50">({s.layoverDuration})</span>
                  )}
                </span>
              ))}
            </span>
          )}
        </div>

        <div className="text-right shrink-0 min-w-[52px] sm:min-w-[58px]">
          <p className="text-[19px] sm:text-xl font-bold tabular-nums leading-none">
            {arrTime}
            {dayDiff && dayDiff > 0 ? (
              <sup className="text-[10px] font-semibold text-muted-foreground ml-0.5">+{dayDiff}</sup>
            ) : null}
          </p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium mt-0.5">{arrCode}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Helper: split segments into outbound/return ── */
function splitSegments(segments: DuffelSegment[], destCode: string) {
  if (!segments?.length || !destCode) return { outbound: segments || [], returnSegs: [] };
  const dest = destCode.toUpperCase();
  
  // Find the split point: first segment that departs from destination
  const splitIdx = segments.findIndex((seg, i) => 
    i > 0 && seg.origin.code.toUpperCase() === dest
  );
  
  if (splitIdx <= 0) return { outbound: segments, returnSegs: [] };
  return {
    outbound: segments.slice(0, splitIdx),
    returnSegs: segments.slice(splitIdx),
  };
}

function parseDurationText(duration?: string): number {
  if (!duration) return 0;

  const hours = duration.match(/(\d+)h/i);
  const minutes = duration.match(/(\d+)m/i);

  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

function calcLayoverMinutes(prev: DuffelSegment, next: DuffelSegment): number {
  try {
    const ms = new Date(next.departingAt).getTime() - new Date(prev.arrivingAt).getTime();
    return Math.max(0, Math.round(ms / 60000));
  } catch {
    return 0;
  }
}

/* ── Helper: compute slice summary from segments ── */
function getSliceSummary(segs: DuffelSegment[]) {
  if (!segs.length) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const depTime = first.departingAt?.split("T")[1]?.slice(0, 5) || "—";
  const arrTime = last.arrivingAt?.split("T")[1]?.slice(0, 5) || "—";
  const depCode = first.origin.code;
  const arrCode = last.destination.code;
  
  // Calculate day difference for +1/+2 indicator
  let dayDiff = 0;
  try {
    const depDate = first.departingAt?.split("T")[0];
    const arrDate = last.arrivingAt?.split("T")[0];
    if (depDate && arrDate) {
      const dep = new Date(depDate);
      const arr = new Date(arrDate);
      dayDiff = Math.round((arr.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24));
    }
  } catch { /* ignore */ }

  const flightMinutes = segs.reduce((total, seg) => total + parseDurationText(seg.duration), 0);
  let totalMin = flightMinutes + segs.slice(1).reduce(
    (total, seg, index) => total + calcLayoverMinutes(segs[index], seg),
    0,
  );

  if (totalMin <= 0) {
    const startMs = new Date(first.departingAt).getTime();
    const endMs = new Date(last.arrivingAt).getTime();
    totalMin = Math.max(0, Math.round((endMs - startMs) / 60000));
  }

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const duration = totalMin > 0 ? `${hours}h ${mins}m` : "—";
  
  const stops = segs.length - 1;
  const stopDetails: { code: string; city: string; layoverDuration: string }[] = [];
  for (let i = 0; i < segs.length - 1; i++) {
    const layMin = calcLayoverMinutes(segs[i], segs[i + 1]);
    const lh = Math.floor(layMin / 60);
    const lm = layMin % 60;
    stopDetails.push({
      code: segs[i].destination.code,
      city: segs[i].destination.city || segs[i].destination.code,
      layoverDuration: layMin > 0 ? `${lh}h ${lm}m` : "",
    });
  }
  
  return { depTime, arrTime, depCode, arrCode, duration, stops, stopDetails, dayDiff };
}

export default function DuffelFlightCard({
  offer,
  index,
  sortBy,
  isLowest,
  isFastest,
  totalPassengers,
  hasReturn,
  onSelect,
  searchDestination,
  onCompare,
  inCompare,
}: DuffelFlightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const isTop = index === 0;
  const { ref: tiltRef, style: tiltStyle, glareStyle, handleMouseMove, handleMouseLeave } = use3DTilt(4, 1.015);
  const badge = isTop ? sortBadgeConfig[sortBy] : null;

  const hasVariants = offer.fareVariants && offer.fareVariants.length > 1;
  const activeVariant = hasVariants ? offer.fareVariants![selectedVariantIdx] : null;
  const activeVariantPricePerPerson = activeVariant?.pricePerPerson ?? activeVariant?.price ?? offer.pricePerPerson ?? offer.price;
  const displayPrice = getAllInPrice(activeVariantPricePerPerson);
  const displayConditions = activeVariant?.conditions ?? offer.conditions;
  const displayBaggage = activeVariant?.baggageDetails ?? offer.baggageDetails;
  const displayFareName = activeVariant?.fareBrandName ?? offer.fareBrandName;
  const displayOfferId = activeVariant?.id ?? offer.id;

  const carrierCodes = offer.carriers?.length
    ? [...new Set(offer.carriers.map(c => c.code))].slice(0, 2)
    : [offer.airlineCode];
  const carrierSummary = carrierCodes.filter(Boolean).join(" · ");

  // Split segments into outbound/return for round-trip
  const { outbound, returnSegs } = useMemo(() => {
    if (!hasReturn || !offer.segments?.length) return { outbound: offer.segments || [], returnSegs: [] };
    const dest = searchDestination || offer.arrival?.code || "";
    return splitSegments(offer.segments, dest);
  }, [offer.segments, hasReturn, searchDestination, offer.arrival?.code]);

  const outboundSummary = useMemo(() => getSliceSummary(outbound), [outbound]);
  const returnSummary = useMemo(() => getSliceSummary(returnSegs), [returnSegs]);
  const hasReturnData = returnSegs.length > 0 && returnSummary;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => !prev);
  };

  return (
    <div
      ref={tiltRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={tiltStyle}
      className={cn(
        "bg-card rounded-xl sm:rounded-xl border p-0 group overflow-hidden will-change-transform",
        "hover:shadow-lg hover:shadow-[hsl(var(--flights))]/8 hover:border-[hsl(var(--flights))]/40",
        isTop
          ? "border-[hsl(var(--flights))]/30 shadow-sm shadow-[hsl(var(--flights))]/4"
          : "border-border/30"
      )}
    >
      {/* 3D Glare overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 rounded-xl" style={glareStyle} />
      {/* Top badge strip */}
      {(isTop || isLowest || isFastest) && (
        <div className="flex gap-1.5 px-3 pt-2 sm:px-4 sm:pt-3">
          {badge && (
            <Badge className={cn("text-[9px] font-bold px-2 py-0.5 border", badge.className)}>
              {badge.label}
            </Badge>
          )}
          {isLowest && !isTop && (
            <Badge className="text-[9px] font-bold px-2 py-0.5 border bg-primary/10 text-primary border-primary/25">
              💰 Cheapest
            </Badge>
          )}
          {isFastest && !isTop && (
            <Badge className="text-[9px] font-bold px-2 py-0.5 border bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border-[hsl(var(--flights))]/25">
              ⚡ Fastest
            </Badge>
          )}
        </div>
      )}

      <div className="px-3 py-2.5 sm:px-4 sm:py-3.5">
        {/* Row 1: Airline + Price */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0" style={{ width: carrierCodes.length > 1 ? 58 : 44, height: 44 }}>
              <AirlineLogo
                iataCode={carrierCodes[0]}
                airlineName={offer.airline}
                size={44}
                className="border border-border/20 bg-card/80 shadow-sm"
              />
              {carrierCodes.length > 1 && (
                <AirlineLogo
                  iataCode={carrierCodes[1]}
                  airlineName=""
                  size={30}
                  className="absolute bottom-0 right-0 border-2 border-card bg-card shadow-sm"
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] sm:text-sm font-semibold leading-tight truncate">{offer.airline}</p>
              <div className="flex items-center gap-1 flex-wrap">
                <p className="text-[10px] text-muted-foreground leading-tight">{offer.flightNumber}</p>
                <p className="text-[9px] text-muted-foreground/70 leading-tight">· {carrierSummary}</p>
                {offer.operatedBy && (
                  <p className="text-[9px] text-muted-foreground/70 leading-tight truncate">· Operated by {offer.operatedBy}</p>
                )}
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-[22px] sm:text-2xl font-extrabold text-[hsl(var(--flights))] tabular-nums leading-none tracking-tight">
              ${Math.round(displayPrice)}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5">
              {hasReturn ? "/person round trip" : "/person"}
            </p>
            {totalPassengers > 1 && (
              <p className="text-[9px] text-muted-foreground/70">
                ${Math.round(displayPrice * totalPassengers)} total
              </p>
            )}
          </div>
        </div>

        {/* Route timelines — outbound */}
        <RouteTimeline
          depTime={hasReturnData && outboundSummary ? outboundSummary.depTime : offer.departure.time}
          depCode={hasReturnData && outboundSummary ? outboundSummary.depCode : offer.departure.code}
          arrTime={hasReturnData && outboundSummary ? outboundSummary.arrTime : offer.arrival.time}
          arrCode={hasReturnData && outboundSummary ? outboundSummary.arrCode : offer.arrival.code}
          duration={hasReturnData && outboundSummary ? outboundSummary.duration : offer.duration}
          stops={hasReturnData && outboundSummary ? outboundSummary.stops : offer.stops}
          stopDetails={hasReturnData && outboundSummary ? outboundSummary.stopDetails : offer.stopDetails}
          dayDiff={hasReturnData && outboundSummary ? outboundSummary.dayDiff : undefined}
          label={hasReturnData ? "Outbound" : undefined}
        />

        {/* Return timeline */}
        {hasReturnData && returnSummary && (
          <div className="mt-3 pt-2.5 border-t border-dashed border-border/30">
            <RouteTimeline
              depTime={returnSummary.depTime}
              depCode={returnSummary.depCode}
              arrTime={returnSummary.arrTime}
              arrCode={returnSummary.arrCode}
              duration={returnSummary.duration}
              stops={returnSummary.stops}
              stopDetails={returnSummary.stopDetails}
              dayDiff={returnSummary.dayDiff}
              label="Return"
            />
          </div>
        )}

        {/* Fare Brand Selector (when multiple fare options exist) */}
        {hasVariants && (
          <div className="mt-3 pt-2.5 border-t border-border/20">
            <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Choose fare</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {offer.fareVariants!.map((variant, idx) => (
                <button type="button"
                  key={variant.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedVariantIdx(idx); }}
                  className={cn(
                    "flex flex-col items-start px-2.5 py-2 rounded-lg border text-left min-w-[110px] shrink-0 transition-all",
                    idx === selectedVariantIdx
                      ? "border-[hsl(var(--flights))] bg-[hsl(var(--flights))]/5 shadow-sm"
                      : "border-border/30 bg-muted/10 hover:border-border/60"
                  )}
                >
                  <span className="text-[8px] text-muted-foreground uppercase tracking-wide">{variant.cabinClass.replace("_", " ")}</span>
                  <span className="text-[10px] font-bold leading-tight mt-0.5 capitalize">{variant.fareBrandName || variant.cabinClass.replace("_", " ")}</span>
                  <span className="text-[11px] font-extrabold text-[hsl(var(--flights))] tabular-nums mt-1">${Math.round(getAllInPrice(variant.pricePerPerson ?? variant.price))}</span>
                  <div className="flex flex-col gap-0.5 mt-1.5 text-[8px]">
                    <span className={variant.baggageDetails.carryOnIncluded ? "text-primary" : "text-muted-foreground"}>
                      {variant.baggageDetails.carryOnIncluded ? "✓ Carry-on" : "✗ No carry-on"}
                    </span>
                    <span className={variant.baggageDetails.checkedBagsIncluded ? "text-primary" : "text-muted-foreground"}>
                      {variant.baggageDetails.checkedBagsIncluded ? `✓ ${variant.baggageDetails.checkedBagQuantity} checked` : "✗ No checked bags"}
                    </span>
                    <span className={variant.conditions.changeable ? "text-primary" : "text-muted-foreground"}>
                      {variant.conditions.changeable ? "✓ Changeable" : "✗ Not changeable"}
                    </span>
                    <span className={variant.conditions.refundable ? "text-primary" : "text-muted-foreground"}>
                      {variant.conditions.refundable ? "✓ Refundable" : "✗ Non-refundable"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Tags + CTA */}
        <div className="flex items-end justify-between gap-2 mt-3">
          <div className="flex gap-1 flex-wrap min-w-0">
            <Badge variant="outline" className="text-[8px] sm:text-[9px] border-border/25 bg-muted/25 capitalize h-[18px] px-1.5 font-medium">
              {displayFareName || offer.cabinClass.replace("_", " ")}
            </Badge>
            {displayBaggage ? (
              <>
                <Badge variant="outline" className={cn(
                  "text-[8px] sm:text-[9px] gap-0.5 h-[18px] px-1.5 font-medium",
                  displayBaggage.carryOnIncluded
                    ? "border-primary/25 text-primary bg-primary/5"
                    : "border-border/25 bg-muted/25 text-muted-foreground"
                )}>
                  <Briefcase className="w-2 h-2 shrink-0" />
                  {displayBaggage.carryOnIncluded ? "Carry-on" : "No carry-on"}
                </Badge>
                <Badge variant="outline" className={cn(
                  "text-[8px] sm:text-[9px] gap-0.5 h-[18px] px-1.5 font-medium",
                  displayBaggage.checkedBagsIncluded
                    ? "border-primary/25 text-primary bg-primary/5"
                    : "border-border/25 bg-muted/25 text-muted-foreground"
                )}>
                  <Briefcase className="w-2 h-2 shrink-0" />
                  {displayBaggage.checkedBagsIncluded
                    ? `${displayBaggage.checkedBagQuantity} checked`
                    : "No checked bags"}
                </Badge>
              </>
            ) : null}
            {displayConditions?.changeable && (
              <Badge variant="outline" className="text-[8px] sm:text-[9px] border-primary/25 text-primary bg-primary/5 h-[18px] px-1.5 font-medium gap-0.5">
                <RefreshCw className="w-2 h-2 shrink-0" />
                Changeable
              </Badge>
            )}
            {displayConditions?.refundable && (
              <Badge variant="outline" className="text-[8px] sm:text-[9px] border-primary/25 text-primary bg-primary/5 h-[18px] px-1.5 font-medium gap-0.5">
                <ShieldCheck className="w-2 h-2 shrink-0" />
                Refundable
              </Badge>
            )}
            {offer.operatedBy && (
              <Badge variant="outline" className="text-[8px] sm:text-[9px] border-border/25 bg-muted/25 text-muted-foreground gap-0.5 h-[18px] px-1.5 font-medium">
                <Repeat className="w-2 h-2 shrink-0" />
                Codeshare
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onCompare && (
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "h-8 px-2.5 text-[11px] font-semibold gap-1 transition-all active:scale-95",
                  inCompare
                    ? "border-[hsl(var(--flights))] bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))]"
                    : "text-muted-foreground hover:border-[hsl(var(--flights))]/50 hover:text-[hsl(var(--flights))]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  const amenities: string[] = [];
                  if (displayBaggage?.carryOnIncluded) amenities.push("Carry-on");
                  if (displayBaggage?.checkedBagsIncluded) amenities.push(`${displayBaggage.checkedBagQuantity} Checked`);
                  if (displayConditions?.refundable) amenities.push("Refundable");
                  if (displayConditions?.changeable) amenities.push("Changeable");
                  onCompare({
                    id: displayOfferId,
                    airline: offer.airline,
                    route: `${offer.departure.code} → ${offer.arrival.code}`,
                    price: Math.round(getAllInPrice(activeVariantPricePerPerson)),
                    duration: offer.duration,
                    stops: offer.stops,
                    departure: offer.departure.time,
                    arrival: offer.arrival.time,
                    amenities,
                  });
                }}
              >
                <Scale className="w-3 h-3" />
                {inCompare ? "Added" : "Compare"}
              </Button>
            )}
            <Button
              size="sm"
              className={cn(
                "h-8 px-4 text-[11px] font-bold shadow-sm active:scale-95 transition-all gap-1 shrink-0",
                "bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 text-primary-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({
                  ...offer,
                  id: displayOfferId,
                  price: activeVariant?.price ?? offer.price,
                  pricePerPerson: activeVariantPricePerPerson,
                  currency: activeVariant?.currency ?? offer.currency,
                  fareBrandName: displayFareName,
                  cabinClass: activeVariant?.cabinClass ?? offer.cabinClass,
                  conditions: displayConditions,
                  baggageDetails: displayBaggage,
                  baggageIncluded: activeVariant?.baggageIncluded ?? offer.baggageIncluded,
                });
              }}
            >
              Select
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Expand toggle */}
        {offer.segments?.length > 0 && (
          <button type="button"
            onClick={toggleExpand}
            className="w-full flex items-center justify-center gap-1 mt-2.5 pt-2 border-t border-border/20 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Hide details" : "Flight details"}
          </button>
        )}
      </div>

      {/* Expandable segment details drawer */}
      <AnimatePresence>
        {expanded && offer.segments?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-2 border-t border-border/20 bg-muted/5 space-y-3">
              {/* Outbound segments */}
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                {hasReturnData ? `Outbound · ${outbound.length} segment${outbound.length > 1 ? "s" : ""}` : `${offer.segments.length} segment${offer.segments.length > 1 ? "s" : ""}`}
              </p>

              {(hasReturnData ? outbound : offer.segments).map((seg, i) => (
                <SegmentRow key={seg.id || i} seg={seg} isLast={hasReturnData ? i === outbound.length - 1 : i === offer.segments.length - 1} />
              ))}

              {/* Outbound layover badges */}
              {outboundSummary && outboundSummary.stopDetails.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {outboundSummary.stopDetails.map((stop, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[8px] border-amber-500/20 bg-amber-500/5 text-amber-600 h-[18px] px-1.5 gap-0.5"
                    >
                      <Clock className="w-2 h-2" />
                      {stop.layoverDuration} layover in {stop.city || stop.code}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Return segments */}
              {hasReturnData && returnSegs.length > 0 && (
                <>
                  <div className="border-t border-dashed border-border/30 pt-3">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Return · {returnSegs.length} segment{returnSegs.length > 1 ? "s" : ""}
                    </p>
                    {returnSegs.map((seg, i) => (
                      <SegmentRow key={seg.id || i} seg={seg} isLast={i === returnSegs.length - 1} />
                    ))}
                    {returnSummary && returnSummary.stopDetails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {returnSummary.stopDetails.map((stop, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[8px] border-amber-500/20 bg-amber-500/5 text-amber-600 h-[18px] px-1.5 gap-0.5"
                          >
                            <Clock className="w-2 h-2" />
                            {stop.layoverDuration} layover in {stop.city || stop.code}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Non-return layover badges fallback */}
              {!hasReturnData && offer.stopDetails?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {offer.stopDetails.map((stop, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-[8px] border-amber-500/20 bg-amber-500/5 text-amber-600 h-[18px] px-1.5 gap-0.5"
                    >
                      <Clock className="w-2 h-2" />
                      {stop.layoverDuration} layover in {stop.city || stop.code}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 3D Boarding Pass */}
              <BoardingPass3D offer={offer} />

              {/* Seat map preview */}
              <SeatMapPreview cabinClass={offer.cabinClass} />

              {/* Conditions + disclosure */}
              <div className="flex flex-wrap gap-1.5 text-[8px] text-muted-foreground pt-1 border-t border-border/10">
                {offer.conditions && (
                  <span>{offer.conditions.changeable ? "✓ Changeable" : "✗ Not changeable"}</span>
                )}
                {offer.conditions && (
                  <span className="ml-2">{offer.conditions.refundable ? "✓ Refundable" : "✗ Non-refundable"}</span>
                )}
                {offer.baggageDetails && (
                  <span className="ml-2">{offer.baggageDetails.carryOnIncluded ? "✓ Carry-on included" : "✗ No carry-on"}</span>
                )}
                {offer.baggageDetails && (
                  <span className="ml-2">{offer.baggageDetails.checkedBagsIncluded ? `✓ ${offer.baggageDetails.checkedBagQuantity} checked bag${offer.baggageDetails.checkedBagQuantity > 1 ? 's' : ''}` : "✗ No checked bags"}</span>
                )}
              </div>

              <p className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
                <ExternalLink className="w-2 h-2 shrink-0" />
                Booking completed via licensed travel partner.{" "}
                <Link to="/partner-disclosure" className="underline hover:text-foreground">Learn more</Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}