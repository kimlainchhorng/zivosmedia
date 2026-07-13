/**
 * Flight Review Page — /flights/details/review
 * Complete booking flow review with step indicator, trip details, fare rules
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { calculateFlightPricing } from "@/utils/flightPricing";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plane, Clock, ChevronRight, ArrowRightLeft,
  MapPin, Timer, Calendar, Users, AlertTriangle, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type DuffelOffer, type DuffelSegment, type DuffelAvailableService, useDuffelOffer, useDuffelFlightSearch } from "@/hooks/useDuffelFlights";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import BoardingPass3D from "@/components/flight/BoardingPass3D";
import { StepIndicator } from "@/components/flight/review/StepIndicator";
import { FareRulesCard } from "@/components/flight/review/FareRulesCard";
import { PriceSummaryCard } from "@/components/flight/review/PriceSummaryCard";
import { DuffelServicesCard } from "@/components/flight/review/DuffelServicesCard";
import { FareVariantsCard } from "@/components/flight/review/FareVariantsCard";
import { cn } from "@/lib/utils";

/* ── Helpers ─────────────────────────────────────────── */
function calcLayover(prev: DuffelSegment, next: DuffelSegment): string {
  try {
    const ms = new Date(next.departingAt).getTime() - new Date(prev.arrivingAt).getTime();
    if (ms <= 0) return "";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${m}m`;
  } catch { return ""; }
}

function parseDurationText(duration?: string): number {
  if (!duration) return 0;

  const normalized = duration.trim().toLowerCase();
  const hourMatch = normalized.match(/(\d+)\s*h/);
  const minuteMatch = normalized.match(/(\d+)\s*m/);

  return (Number(hourMatch?.[1] || 0) * 60) + Number(minuteMatch?.[1] || 0);
}

const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); } catch { return d; }
};
const formatDateShort = (d: string) => {
  try { return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); } catch { return d; }
};
const formatTime = (d: string) => {
  try { return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; }
};

function getSliceInfo(segs: DuffelSegment[]) {
  if (!segs.length) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];

  const segmentMinutes = segs.reduce((total, seg) => total + parseDurationText(seg.duration), 0);
  const layoverMinutes = segs.slice(1).reduce((total, seg, index) => {
    const layover = calcLayover(segs[index], seg);
    return total + parseDurationText(layover);
  }, 0);

  let totalMinutes = segmentMinutes + layoverMinutes;
  if (totalMinutes <= 0) {
    const totalMs = new Date(last.arrivingAt).getTime() - new Date(first.departingAt).getTime();
    totalMinutes = Math.max(0, Math.round(totalMs / 60000));
  }

  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  return {
    depTime: formatTime(first.departingAt), arrTime: formatTime(last.arrivingAt),
    depCode: first.origin.code, arrCode: last.destination.code,
    depCity: first.origin.city, arrCity: last.destination.city,
    stops: segs.length - 1, duration: `${totalH}h ${totalM}m`,
    depDate: first.departingAt, arrDate: last.arrivingAt,
    stopCities: segs.slice(1).map(s => s.origin.code),
    carriers: [...new Set(segs.map(s => s.operatingCarrier || s.marketingCarrier))],
    carrierCodes: [...new Set(segs.map(s => s.operatingCarrierCode || s.marketingCarrierCode))],
  };
}

function buildOfferFingerprint(offer?: Pick<DuffelOffer, "segments"> | null) {
  if (!offer?.segments?.length) return "";
  return offer.segments
    .map((segment) => `${segment.marketingCarrierCode}${segment.flightNumber}-${segment.departingAt}-${segment.arrivingAt}`)
    .join("|");
}

function buildFareVariantsFromOffers(offers: DuffelOffer[]) {
  const seen = new Map<string, NonNullable<DuffelOffer["fareVariants"]>[number]>();

  const buildVariantKey = (variant: NonNullable<DuffelOffer["fareVariants"]>[number]) => {
    const bag = variant.baggageDetails;
    const conditions = variant.conditions;

    return [
      variant.cabinClass,
      (variant.fareBrandName || variant.cabinClass).toLowerCase(),
      variant.baggageIncluded || "",
      bag.carryOnIncluded ? "co1" : "co0",
      bag.carryOnQuantity,
      bag.carryOnWeightKg ?? "",
      bag.carryOnWeightLb ?? "",
      bag.checkedBagsIncluded ? "cb1" : "cb0",
      bag.checkedBagQuantity,
      bag.checkedBagWeightKg ?? "",
      bag.checkedBagWeightLb ?? "",
      conditions.changeable ? "chg1" : "chg0",
      conditions.changePenalty ?? "",
      conditions.refundable ? "ref1" : "ref0",
      conditions.refundPenalty ?? "",
      conditions.penaltyCurrency || "",
    ].join("::");
  };

  for (const offer of offers) {
    const sourceVariants = offer.fareVariants?.length
      ? offer.fareVariants
      : [{
          id: offer.id,
          fareBrandName: offer.fareBrandName || offer.cabinClass,
          price: offer.price,
          pricePerPerson: offer.pricePerPerson,
          currency: offer.currency,
          conditions: offer.conditions,
          baggageDetails: offer.baggageDetails,
          baggageIncluded: offer.baggageIncluded,
          cabinClass: offer.cabinClass,
        }];

    for (const variant of sourceVariants) {
      const key = buildVariantKey(variant);
      const existing = seen.get(key);
      const variantUnitPrice = variant.pricePerPerson ?? variant.price;
      const existingUnitPrice = existing?.pricePerPerson ?? existing?.price ?? Number.POSITIVE_INFINITY;

      if (!existing || variantUnitPrice < existingUnitPrice) {
        seen.set(key, variant);
      }
    }
  }

  const variants = Array.from(seen.values()).sort(
    (a, b) => (a.pricePerPerson ?? a.price) - (b.pricePerPerson ?? b.price),
  );
  return variants.length > 1 ? variants : undefined;
}

function buildFareVariantKey(variant: NonNullable<DuffelOffer["fareVariants"]>[number]) {
  const bag = variant.baggageDetails;
  const conditions = variant.conditions;

  return [
    variant.cabinClass,
    (variant.fareBrandName || variant.cabinClass).toLowerCase(),
    variant.baggageIncluded || "",
    bag.carryOnIncluded ? "co1" : "co0",
    bag.carryOnQuantity,
    bag.carryOnWeightKg ?? "",
    bag.carryOnWeightLb ?? "",
    bag.checkedBagsIncluded ? "cb1" : "cb0",
    bag.checkedBagQuantity,
    bag.checkedBagWeightKg ?? "",
    bag.checkedBagWeightLb ?? "",
    conditions.changeable ? "chg1" : "chg0",
    conditions.changePenalty ?? "",
    conditions.refundable ? "ref1" : "ref0",
    conditions.refundPenalty ?? "",
    conditions.penaltyCurrency || "",
  ].join("::");
}

function mergeFareVariants(
  ...variantSets: Array<NonNullable<DuffelOffer["fareVariants"]> | undefined>
): NonNullable<DuffelOffer["fareVariants"]> | undefined {
  const seen = new Map<string, NonNullable<DuffelOffer["fareVariants"]>[number]>();

  for (const variants of variantSets) {
    if (!variants?.length) continue;

    for (const variant of variants) {
      const key = buildFareVariantKey(variant);
      const existing = seen.get(key);
      const variantUnitPrice = variant.pricePerPerson ?? variant.price;
      const existingUnitPrice = existing?.pricePerPerson ?? existing?.price ?? Number.POSITIVE_INFINITY;

      if (!existing || variantUnitPrice < existingUnitPrice || variant.id === existing.id) {
        seen.set(key, variant);
      }
    }
  }

  // Deduplicate by variant.id to prevent duplicate React keys
  const byId = new Map<string, NonNullable<DuffelOffer["fareVariants"]>[number]>();
  for (const variant of seen.values()) {
    const existing = byId.get(variant.id);
    if (!existing || (variant.pricePerPerson ?? variant.price) < (existing.pricePerPerson ?? existing.price)) {
      byId.set(variant.id, variant);
    }
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => (a.pricePerPerson ?? a.price) - (b.pricePerPerson ?? b.price),
  );
  return merged.length ? merged : undefined;
}

function buildFallbackFareVariant(offer: DuffelOffer): NonNullable<DuffelOffer["fareVariants"]>[number] {
  return {
    id: offer.id,
    fareBrandName: offer.fareBrandName || offer.cabinClass,
    price: offer.price,
    pricePerPerson: offer.pricePerPerson || offer.price,
    currency: offer.currency,
    conditions: offer.conditions,
    baggageDetails: offer.baggageDetails,
    baggageIncluded: offer.baggageIncluded,
    cabinClass: offer.cabinClass,
  };
}

/* ── 3D Slice Overview Card ───────────────────────────── */
function SliceCard({ info, label, rotate, segs }: {
  info: NonNullable<ReturnType<typeof getSliceInfo>>;
  label: string; rotate?: boolean; segs: DuffelSegment[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-7 h-7 rounded-xl bg-gradient-to-br from-[hsl(var(--flights))]/15 to-[hsl(var(--flights))]/5 flex items-center justify-center"
          style={{
            transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
            boxShadow: "0 6px 14px -6px hsl(var(--flights)/0.25), inset 0 1px 0 hsl(var(--background)/0.5)",
          }}
        >
          <Plane className={cn("w-3.5 h-3.5 text-[hsl(var(--flights))]", rotate && "rotate-180")} />
        </div>
        <p className="text-[11px] font-extrabold text-[hsl(var(--flights))] uppercase tracking-[0.12em]">{label}</p>
        <span
          className="text-[9px] font-bold ml-auto px-2.5 py-1 rounded-xl border border-border/15 text-muted-foreground"
          style={{
            background: "linear-gradient(135deg, hsl(var(--muted)/0.3), transparent)",
            boxShadow: "0 2px 6px -3px hsl(var(--foreground)/0.06)",
          }}
        >
          {formatDateShort(info.depDate)}
        </span>
      </div>

      <div
        className="overflow-hidden rounded-3xl border-[1.5px] border-[hsl(var(--flights))]/20 relative"
        style={{
          background: "hsl(var(--card))",
          boxShadow: `0 24px 48px -16px hsl(var(--flights)/0.12),
                       0 8px 16px -6px hsl(var(--foreground)/0.04),
                       inset 0 1.5px 0 hsl(var(--background)/0.8),
                       inset 0 -1px 0 hsl(var(--foreground)/0.03)`,
          transform: "perspective(600px) rotateX(1deg)",
        }}
      >
        {/* Top glow bar */}
        <div
          className="absolute left-4 right-4 top-0 h-[2.5px] rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--flights)), transparent)",
            boxShadow: "0 0 12px 2px hsl(var(--flights)/0.2)",
          }}
        />

        {/* Carrier strip */}
        <div
          className="px-4 py-3 flex items-center gap-3 border-b border-[hsl(var(--flights))]/10"
          style={{ background: "linear-gradient(135deg, hsl(var(--flights)/0.06), transparent)" }}
        >
          <div className="flex items-center -space-x-2">
            {info.carrierCodes.slice(0, 2).map((code, ci) => (
              <AirlineLogo
                key={code + ci}
                iataCode={code}
                airlineName={info.carriers[ci] || ""}
                size={ci === 0 ? 36 : 28}
                className={cn("border border-border/20 bg-card shadow-sm", ci > 0 && "relative z-10")}
              />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold truncate">{info.carriers.join(" + ")}</p>
            <p className="text-[9px] text-muted-foreground">{segs[0].flightNumber}</p>
          </div>
          <div
            className="flex items-center gap-1.5 text-[9px] text-muted-foreground rounded-xl border border-border/15 px-2.5 py-1"
            style={{
              background: "linear-gradient(135deg, hsl(var(--muted)/0.3), transparent)",
              boxShadow: "0 2px 6px -3px hsl(var(--foreground)/0.06)",
            }}
          >
            <Timer className="w-3 h-3" />
            <span className="font-bold">{info.duration}</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Route timeline */}
          <div className="flex items-center gap-2">
            <div className="text-left shrink-0">
              <p className="text-[26px] sm:text-3xl font-extrabold tabular-nums leading-none tracking-tight">{info.depTime}</p>
              <p className="text-xs text-[hsl(var(--flights))] font-bold mt-1">{info.depCode}</p>
              <p className="text-[10px] text-muted-foreground">{info.depCity}</p>
            </div>
            <div className="flex flex-col items-center flex-1 min-w-0 px-1">
              <div className="w-full h-[2px] bg-gradient-to-r from-[hsl(var(--flights))] via-[hsl(var(--flights))]/30 to-[hsl(var(--flights))] relative rounded-full"
                style={{ boxShadow: "0 1px 4px -1px hsl(var(--flights)/0.3)" }}
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[hsl(var(--flights))] border-2 border-card shadow-sm"
                  style={{ boxShadow: "0 2px 6px -1px hsl(var(--flights)/0.4)" }} />
                {info.stops > 0 && Array.from({ length: Math.min(info.stops, 3) }).map((_, i) => (
                  <div key={i} className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground/40 border-2 border-card"
                    style={{ left: `${((i + 1) / (Math.min(info.stops, 3) + 1)) * 100}%` }} />
                ))}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[hsl(var(--flights))] border-2 border-card shadow-sm"
                  style={{ boxShadow: "0 2px 6px -1px hsl(var(--flights)/0.4)" }} />
              </div>
              <span className={cn("text-[10px] font-bold mt-1.5", info.stops === 0 ? "text-primary" : "text-[hsl(var(--flights))]")}>
                {info.stops === 0 ? "Nonstop" : `${info.stops} stop${info.stops > 1 ? "s" : ""}`}
              </span>
              {info.stopCities.length > 0 && (
                <span className="text-[9px] text-muted-foreground mt-0.5">via {info.stopCities.join(", ")}</span>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[26px] sm:text-3xl font-extrabold tabular-nums leading-none tracking-tight">{info.arrTime}</p>
              <p className="text-xs text-[hsl(var(--flights))] font-bold mt-1">{info.arrCode}</p>
              <p className="text-[10px] text-muted-foreground">{info.arrCity}</p>
            </div>
          </div>

          <div
            className="flex justify-between text-[10px] text-muted-foreground rounded-2xl px-3.5 py-2.5 border border-border/15"
            style={{
              background: "linear-gradient(145deg, hsl(var(--muted)/0.35), hsl(var(--muted)/0.15))",
              boxShadow: "inset 0 2px 4px -1px hsl(var(--foreground)/0.04), inset 0 -1px 0 hsl(var(--background)/0.5)",
            }}
          >
            <span className="font-medium flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(info.depDate)}</span>
            {segs[0].origin.terminal && <span>Terminal {segs[0].origin.terminal}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 3D Segment Detail Card ────────────────────────────── */
function SegmentDetails({ segs, label, rotate }: { segs: DuffelSegment[]; label: string; rotate?: boolean }) {
  return (
    <div
      className="overflow-hidden rounded-3xl border-[1.5px] border-border/20"
      style={{
        background: "hsl(var(--card))",
        boxShadow: `0 20px 40px -16px hsl(var(--foreground)/0.07),
                     0 6px 12px -4px hsl(var(--foreground)/0.03),
                     inset 0 1.5px 0 hsl(var(--background)/0.8),
                     inset 0 -1px 0 hsl(var(--foreground)/0.03)`,
        transform: "perspective(600px) rotateX(1deg)",
      }}
    >
      <div
        className="px-5 py-3 border-b border-border/15 flex items-center gap-2.5"
        style={{ background: "linear-gradient(135deg, hsl(var(--muted)/0.3), transparent)" }}
      >
        <div
          className="w-7 h-7 rounded-xl bg-gradient-to-br from-[hsl(var(--flights))]/15 to-[hsl(var(--flights))]/5 flex items-center justify-center"
          style={{
            transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
            boxShadow: "0 6px 14px -6px hsl(var(--flights)/0.2), inset 0 1px 0 hsl(var(--background)/0.5)",
          }}
        >
          <Plane className={cn("w-3 h-3 text-[hsl(var(--flights))]", rotate && "rotate-180")} />
        </div>
        <p className="text-[12px] font-extrabold tracking-wide">{label}</p>
        <span
          className="text-[9px] font-bold ml-auto px-2.5 py-1 rounded-xl border border-border/15"
          style={{
            background: "linear-gradient(135deg, hsl(var(--muted)/0.3), transparent)",
            boxShadow: "0 2px 6px -3px hsl(var(--foreground)/0.06)",
          }}
        >
          {segs.length} leg{segs.length > 1 ? "s" : ""}
        </span>
      </div>
      <div>
        {segs.map((seg, i) => (
          <div key={seg.id || i}>
            {i > 0 && (
              <div className="flex items-center gap-2.5 px-5 py-3 border-y border-dashed border-border/20"
                style={{ background: "linear-gradient(135deg, hsl(var(--muted)/0.25), transparent)" }}
              >
                <div
                  className="w-7 h-7 rounded-xl bg-muted/50 flex items-center justify-center"
                  style={{ boxShadow: "inset 0 1px 2px hsl(var(--foreground)/0.04)" }}
                >
                  <Clock className="w-3 h-3 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] font-bold">Layover in {seg.origin.city} ({seg.origin.code})</p>
                  <p className="text-[9px] text-muted-foreground">{calcLayover(segs[i - 1], seg)} · {seg.origin.name}</p>
                </div>
              </div>
            )}
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <AirlineLogo
                  iataCode={seg.operatingCarrierCode || seg.marketingCarrierCode}
                  airlineName={seg.operatingCarrier || seg.marketingCarrier}
                  size={28} className="border border-border/20 bg-card shadow-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold truncate">{seg.operatingCarrier || seg.marketingCarrier} · {seg.flightNumber}</p>
                  <p className="text-[9px] text-muted-foreground flex items-center gap-1 flex-wrap">
                    {seg.aircraft && <span>{seg.aircraft}</span>}
                    {seg.aircraft && seg.cabinClass && <span>·</span>}
                    {seg.cabinClass && <span className="capitalize">{seg.cabinClass.replace("_", " ")}</span>}
                  </p>
                </div>
                {seg.duration && (
                  <span
                    className="text-[9px] font-bold gap-1 px-2.5 py-1 border border-border/15 rounded-xl flex items-center text-muted-foreground"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--muted)/0.3), transparent)",
                      boxShadow: "0 2px 6px -3px hsl(var(--foreground)/0.06)",
                    }}
                  >
                    <Clock className="w-2.5 h-2.5" />{seg.duration}
                  </span>
                )}
              </div>
              <div className="ml-3.5 pl-5 relative">
                <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-gradient-to-b from-[hsl(var(--flights))] via-[hsl(var(--flights))]/30 to-[hsl(var(--flights))]"
                  style={{ boxShadow: "0 0 6px -1px hsl(var(--flights)/0.2)" }} />
                <div className="flex items-start gap-3 relative pb-4">
                  <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-[hsl(var(--flights))] border-2 border-card shadow-sm z-10"
                    style={{ boxShadow: "0 2px 6px -1px hsl(var(--flights)/0.4)" }} />
                  <div>
                    <p className="text-sm font-bold tabular-nums leading-none">{formatTime(seg.departingAt)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {seg.origin.code} · {seg.origin.city}
                      {seg.origin.terminal && <span className="text-muted-foreground/60"> · T{seg.origin.terminal}</span>}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60">{formatDateShort(seg.departingAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 relative">
                  <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-[hsl(var(--flights))] border-2 border-card shadow-sm z-10"
                    style={{ boxShadow: "0 2px 6px -1px hsl(var(--flights)/0.4)" }} />
                  <div>
                    <p className="text-sm font-bold tabular-nums leading-none">{formatTime(seg.arrivingAt)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {seg.destination.code} · {seg.destination.city}
                      {seg.destination.terminal && <span className="text-muted-foreground/60"> · T{seg.destination.terminal}</span>}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60">{formatDateShort(seg.arrivingAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────── */
const FlightReview = () => {
  const navigate = useNavigate();
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<DuffelAvailableService[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const handleToggleService = useCallback((svc: DuffelAvailableService) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(svc.id)) {
        setSelectedServices(s => s.filter(x => x.id !== svc.id));
        return prev.filter(id => id !== svc.id);
      }
      setSelectedServices(s => [...s, svc]);
      return [...prev, svc.id];
    });
  }, []);

  const [storedOffer, setStoredOffer] = useState<DuffelOffer | null>(() => {
    try {
      const raw = sessionStorage.getItem("zivo_selected_offer");
      const snapshotRaw = sessionStorage.getItem("zivo_selected_offer_snapshot");
      const parsed = raw ? JSON.parse(raw) : null;
      const snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;
      return parsed?.fareVariants || !snapshot?.fareVariants
        ? parsed
        : parsed
          ? { ...parsed, fareVariants: snapshot.fareVariants }
          : snapshot;
    } catch { return null; }
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("zivo_selected_offer");
      const snapshotRaw = sessionStorage.getItem("zivo_selected_offer_snapshot");
      const parsed = raw ? JSON.parse(raw) : null;
      const snapshot = snapshotRaw ? JSON.parse(snapshotRaw) : null;
      const merged = parsed?.fareVariants || !snapshot?.fareVariants
        ? parsed
        : parsed
          ? { ...parsed, fareVariants: snapshot.fareVariants }
          : snapshot;
      setStoredOffer(merged);
    } catch { /* ignore */ }
  }, []);

  const [searchParams, setSearchParams] = useState<Record<string, any>>(() => {
    try {
      const raw = sessionStorage.getItem("zivo_search_params");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("zivo_search_params");
      setSearchParams(raw ? JSON.parse(raw) : {});
    } catch { /* ignore */ }
  }, []);

  const recoveryCabinClass = (searchParams.cabinClass === "premium" ? "premium_economy" : (searchParams.cabinClass || "economy")) as "economy" | "premium_economy" | "business" | "first";
  const storedFareVariantCount = storedOffer?.fareVariants?.length ?? 0;
  const shouldRecoverFareVariants = storedFareVariantCount <= 1 && !!storedOffer?.segments?.length && !!searchParams.origin && !!searchParams.destination && !!searchParams.departureDate;

  const { data: recoverySearchData } = useDuffelFlightSearch({
    origin: searchParams.origin || "",
    destination: searchParams.destination || "",
    departureDate: searchParams.departureDate || "",
    returnDate: searchParams.returnDate || undefined,
    passengers: {
      adults: searchParams.adults || 1,
      children: searchParams.children || 0,
      infants: searchParams.infants || 0,
    },
    cabinClass: recoveryCabinClass,
    enabled: shouldRecoverFareVariants,
  });

  const recoveredFareVariants = useMemo(() => {
    if (!shouldRecoverFareVariants || !storedOffer || !recoverySearchData?.offers?.length) return undefined;
    const targetFingerprint = buildOfferFingerprint(storedOffer);
    if (!targetFingerprint) return undefined;
    const matchingOffers = recoverySearchData.offers.filter((candidate) => buildOfferFingerprint(candidate) === targetFingerprint);
    return matchingOffers.length ? buildFareVariantsFromOffers(matchingOffers) : undefined;
  }, [shouldRecoverFareVariants, storedOffer, recoverySearchData]);

  const { data: liveOffer } = useDuffelOffer(storedOffer?.id ?? null);
  const offer = useMemo(() => {
    if (!liveOffer && !storedOffer) return null;
    const base = liveOffer ?? storedOffer;
    if (!base) return null;
    const baseFareVariants = base.fareVariants?.length ? base.fareVariants : undefined;
    const storedFareVariants = storedOffer?.fareVariants?.length ? storedOffer.fareVariants : undefined;
    const hasRealFareVariants = Boolean(baseFareVariants?.length || storedFareVariants?.length || recoveredFareVariants?.length);
    const fareVariants = mergeFareVariants(
      hasRealFareVariants ? undefined : [buildFallbackFareVariant(base)],
      baseFareVariants,
      storedFareVariants,
      recoveredFareVariants,
    );
    return { ...base, fareVariants: fareVariants?.length ? fareVariants : [buildFallbackFareVariant(base)] };
  }, [liveOffer, storedOffer, recoveredFareVariants]);

  const selectedVariant = useMemo(() => {
    if (!offer?.fareVariants?.length) return undefined;

    return offer.fareVariants.find((variant) => variant.id === selectedVariantId)
      ?? offer.fareVariants.find((variant) => variant.id === storedOffer?.id)
      ?? offer.fareVariants[0];
  }, [offer, selectedVariantId, storedOffer?.id]);

  const reviewOffer = useMemo(() => {
    if (!offer) return null;
    if (!selectedVariant) return offer;

    return {
      ...offer,
      id: selectedVariant.id,
      price: selectedVariant.price,
      pricePerPerson: selectedVariant.pricePerPerson ?? selectedVariant.price,
      currency: selectedVariant.currency,
      fareBrandName: selectedVariant.fareBrandName,
      cabinClass: selectedVariant.cabinClass,
      conditions: selectedVariant.conditions,
      baggageDetails: selectedVariant.baggageDetails,
      baggageIncluded: selectedVariant.baggageIncluded,
    };
  }, [offer, selectedVariant]);

  useEffect(() => {
    if (!offer?.fareVariants?.length) {
      setSelectedVariantId(null);
      return;
    }

    const nextSelectedId = offer.fareVariants.some((variant) => variant.id === selectedVariantId)
      ? selectedVariantId
      : (offer.fareVariants.find((variant) => variant.id === storedOffer?.id)?.id ?? offer.fareVariants[0]?.id ?? null);

    if (nextSelectedId !== selectedVariantId) {
      setSelectedVariantId(nextSelectedId);
    }
  }, [offer, selectedVariantId, storedOffer?.id]);

  useEffect(() => {
    if (reviewOffer) {
      sessionStorage.setItem("zivo_selected_offer", JSON.stringify(reviewOffer));
      if (reviewOffer.fareVariants?.length) {
        sessionStorage.setItem("zivo_selected_offer_snapshot", JSON.stringify(reviewOffer));
      }
    }
  }, [reviewOffer]);

  const totalPassengers = (searchParams.adults || 1) + (searchParams.children || 0) + (searchParams.infants || 0);
  const segments = reviewOffer?.segments || [];
  const isRoundTrip = !!searchParams.returnDate;

  const { outboundSegments, returnSegments } = useMemo(() => {
    if (!isRoundTrip || segments.length === 0) {
      return { outboundSegments: segments, returnSegments: [] as DuffelSegment[] };
    }
    const destCode = (searchParams.destination || offer?.arrival?.code || "").toUpperCase();
    let splitIdx = -1;
    for (let i = 1; i < segments.length; i++) {
      if (segments[i].origin.code.toUpperCase() === destCode) { splitIdx = i; break; }
    }
    if (splitIdx === -1 && searchParams.returnDate) {
      const returnDate = new Date(searchParams.returnDate + "T00:00:00").getTime();
      for (let i = 1; i < segments.length; i++) {
        if (new Date(segments[i].departingAt).getTime() >= returnDate) { splitIdx = i; break; }
      }
    }
    if (splitIdx === -1) return { outboundSegments: segments, returnSegments: [] as DuffelSegment[] };
    return { outboundSegments: segments.slice(0, splitIdx), returnSegments: segments.slice(splitIdx) };
  }, [segments, isRoundTrip, searchParams, reviewOffer?.arrival?.code]);

  if (!reviewOffer) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-20">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Plane className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold mb-2">No Flight Selected</h1>
            <p className="text-sm text-muted-foreground mb-6">Please search and select a flight first.</p>
            <Button asChild className="bg-[hsl(var(--flights))]"><Link to="/flights">Search Flights</Link></Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleContinue = () => navigate("/flights/traveler-info");
  const handleBack = () => navigate(-1);
  const outboundInfo = getSliceInfo(outboundSegments);
  const returnInfo = getSliceInfo(returnSegments);

  return (
    <div className="min-h-[100dvh] bg-background relative overflow-hidden flex flex-col">
      <SEOHead
        title={`Review Flight ${reviewOffer.departure.code} → ${reviewOffer.arrival.code} – ZIVO`}
        description={`Review your ${reviewOffer.airline} flight from ${reviewOffer.departure.city} to ${reviewOffer.arrival.city}.`}
      />

      {/* Decorative orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-[hsl(var(--flights))]/6 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-52 h-52 rounded-full bg-[hsl(var(--flights))]/4 blur-3xl" />
      </div>

      <Header />

      <main className="flex-1 pt-24 pb-32 sm:pb-20 relative z-10">
        <div className="mx-auto px-3 sm:px-4 max-w-2xl">

          {/* Step indicator */}
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
            <StepIndicator current={2} />
          </motion.div>

          {/* Back + badges */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5 text-muted-foreground -ml-2 h-8 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to results
            </Button>
            <div className="flex items-center gap-2">
              {isRoundTrip && (
                <Badge className="text-[9px] font-bold bg-[hsl(var(--flights))]/10 text-[hsl(var(--flights))] border border-[hsl(var(--flights))]/20 gap-1 px-2 py-0.5">
                  <ArrowRightLeft className="w-3 h-3" /> Round trip
                </Badge>
              )}
              <Badge variant="outline" className="text-[9px] font-bold gap-1 px-2 py-0.5 border-border/40">
                <Users className="w-3 h-3" /> {totalPassengers} traveler{totalPassengers > 1 ? "s" : ""}
              </Badge>
            </div>
          </motion.div>

          {/* Page title */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">Review your flight</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Confirm all details before continuing to passenger information
            </p>
          </motion.div>

          {/* Outbound slice */}
          {outboundInfo && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SliceCard info={outboundInfo} label={isRoundTrip ? "Outbound Flight" : "Your Flight"} segs={outboundSegments} />
            </motion.div>
          )}

          {/* Return slice */}
          {returnInfo && returnSegments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="mt-4">
              <SliceCard info={returnInfo} label="Return Flight" rotate segs={returnSegments} />
            </motion.div>
          )}

          {/* 3D Boarding Pass */}
          <motion.div initial={{ opacity: 0, y: 16, rotateX: -8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="mt-4">
            <BoardingPass3D offer={reviewOffer} />
          </motion.div>

          {/* Segment timelines */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 space-y-3">
            <SegmentDetails segs={outboundSegments} label={isRoundTrip ? "Outbound Segments" : "Flight Segments"} />
            {returnSegments.length > 0 && <SegmentDetails segs={returnSegments} label="Return Segments" rotate />}
          </motion.div>

          {/* Fare Rules & Policies */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-3">
            <FareRulesCard offer={reviewOffer} />
          </motion.div>

          {/* ── Fare Variants (Basic Economy / Main Cabin / etc.) ── */}
          {offer.fareVariants && offer.fareVariants.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="mt-3">
              <FareVariantsCard
                offer={offer}
                selectedFareId={selectedVariantId}
                onSelectFare={(variant) => {
                  setSelectedVariantId(variant.id);
                  const updated = {
                    ...offer,
                    id: variant.id,
                    price: variant.price,
                    pricePerPerson: variant.pricePerPerson ?? variant.price,
                    currency: variant.currency,
                    fareBrandName: variant.fareBrandName,
                    cabinClass: variant.cabinClass,
                    conditions: variant.conditions,
                    baggageDetails: variant.baggageDetails,
                    baggageIncluded: variant.baggageIncluded,
                  };
                  setStoredOffer(updated);
                  sessionStorage.setItem("zivo_selected_offer", JSON.stringify(updated));
                }}
              />
            </motion.div>
          )}

          {/* ── Real Available Services from Duffel ───── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="mt-3">
            <DuffelServicesCard
                offerId={reviewOffer.id}
              selectedServiceIds={selectedServiceIds}
              onToggleService={handleToggleService}
            />
          </motion.div>

          {/* Price Summary */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="mt-3">
            <PriceSummaryCard offer={reviewOffer} searchParams={searchParams} totalPassengers={totalPassengers} isRoundTrip={isRoundTrip} />
          </motion.div>

          {/* Partner disclosure — 3D */}
          <motion.div initial={{ opacity: 0, y: 12, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ delay: 0.35, duration: 0.5 }} className="mt-3">
            <div
              className="flex items-start gap-3 px-4 py-3.5 rounded-3xl border-[1.5px] border-[hsl(var(--flights))]/15"
              style={{
                background: "linear-gradient(135deg, hsl(var(--flights)/0.04), transparent)",
                boxShadow: `0 12px 24px -10px hsl(var(--flights)/0.08),
                             inset 0 1px 0 hsl(var(--background)/0.6)`,
                transform: "perspective(600px) rotateX(1deg)",
              }}
            >
              <div
                className="w-8 h-8 rounded-xl bg-[hsl(var(--flights))]/10 flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
                  boxShadow: "0 4px 10px -4px hsl(var(--flights)/0.2), inset 0 1px 0 hsl(var(--background)/0.5)",
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--flights))]" />
              </div>
              <div>
                <p className="text-[11px] font-medium leading-relaxed">
                  Continuing will proceed to a <span className="font-bold">real booking flow</span>.
                  You'll be asked for passenger details and payment.
                  Final price and terms are confirmed at checkout.
                </p>
                <Link to="/partner-disclosure" className="text-[10px] text-[hsl(var(--flights))] hover:underline mt-1.5 inline-block font-semibold">
                  Partner disclosure →
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Trust badges — 3D floating pills */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.4 }} className="mt-3">
            <div className="flex items-center justify-center gap-3 py-3">
              {[
                { icon: Shield, text: "Secure booking" },
                { icon: MapPin, text: "Real-time prices" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium px-3.5 py-2 rounded-2xl border border-border/15"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--muted)/0.25), transparent)",
                    boxShadow: "0 4px 10px -4px hsl(var(--foreground)/0.05), inset 0 1px 0 hsl(var(--background)/0.5)",
                    transform: "perspective(300px) rotateX(2deg)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 text-[hsl(var(--flights))]/70" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Desktop CTA — 3D buttons */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-4 hidden sm:flex gap-3">
            <Button variant="outline" onClick={handleBack} className="flex-1 border-border/30 rounded-2xl h-12">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Results
            </Button>
            <Button
              onClick={handleContinue}
              className="flex-1 bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 font-bold gap-2 active:scale-95 transition-all rounded-2xl h-12"
              style={{
                boxShadow: "0 8px 24px -6px hsl(var(--flights)/0.35), inset 0 1px 0 hsl(var(--background)/0.15)",
              }}
            >
              Continue to Passenger Details <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </main>

      {/* Sticky mobile CTA — 3D glassmorphic */}
      <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden">
        <div
          className="backdrop-blur-2xl border-t border-[hsl(var(--flights))]/10 px-4 py-3.5"
          style={{
            background: "hsl(var(--card)/0.85)",
            boxShadow: "0 -8px 24px -4px hsl(var(--flights)/0.08), inset 0 1px 0 hsl(var(--background)/0.5)",
            paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 0.875rem)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Total price</p>
              <motion.p
                  key={reviewOffer.id}
                initial={{ scale: 0.95, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-xl font-extrabold text-[hsl(var(--flights))] tabular-nums leading-none"
                style={{ textShadow: "0 3px 12px hsl(var(--flights)/0.2)" }}
              >
                  ${calculateFlightPricing(reviewOffer.pricePerPerson ?? reviewOffer.price, totalPassengers, reviewOffer.currency || "USD").totalAllPassengers.toFixed(2)}
              </motion.p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                  {totalPassengers > 1 ? `${totalPassengers} travelers` : "1 traveler"} · {isRoundTrip ? "Round trip" : "One way"} · {reviewOffer.currency || "USD"}
              </p>
            </div>
            <Button
              onClick={handleContinue}
              className="bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90 font-bold gap-1.5 active:scale-95 transition-all h-12 px-6 text-sm rounded-2xl"
              style={{
                boxShadow: "0 8px 24px -6px hsl(var(--flights)/0.4), inset 0 1px 0 hsl(var(--background)/0.15)",
              }}
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden sm:block"><Footer /></div>
    </div>
  );
};

export default FlightReview;
