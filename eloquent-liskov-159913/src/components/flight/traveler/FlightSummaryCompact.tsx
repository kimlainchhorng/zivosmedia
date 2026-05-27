/**
 * Compact flight summary card — Premium 3D spatial design
 * Shows real Duffel API fare data: baggage, cabin, conditions
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { AirlineLogo } from "@/components/flight/AirlineLogo";
import type { DuffelOffer, DuffelSegment } from "@/hooks/useDuffelFlights";
import { getAllInPrice } from "@/utils/flightPricing";

function calcLayoverMinutes(prev: DuffelSegment, next: DuffelSegment): number {
  try {
    const ms = new Date(next.departingAt).getTime() - new Date(prev.arrivingAt).getTime();
    return Math.max(0, Math.round(ms / 60000));
  } catch {
    return 0;
  }
}

function parseDurationText(duration?: string): number {
  if (!duration) return 0;
  const normalized = duration.trim().toLowerCase();
  const hourMatch = normalized.match(/(\d+)\s*h/);
  const minuteMatch = normalized.match(/(\d+)\s*m/);
  return (Number(hourMatch?.[1] || 0) * 60) + Number(minuteMatch?.[1] || 0);
}

function getSliceInfo(segs: DuffelSegment[]) {
  if (!segs.length) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const depTime = first.departingAt?.split("T")[1]?.slice(0, 5) || "—";
  const arrTime = last.arrivingAt?.split("T")[1]?.slice(0, 5) || "—";

  const flightMinutes = segs.reduce((total, seg) => total + parseDurationText(seg.duration), 0);
  const layoverMinutes = segs.slice(1).reduce((total, seg, index) => total + calcLayoverMinutes(segs[index], seg), 0);
  let totalMin = flightMinutes + layoverMinutes;

  if (totalMin <= 0) {
    const startMs = new Date(first.departingAt).getTime();
    const endMs = new Date(last.arrivingAt).getTime();
    totalMin = Math.max(0, Math.round((endMs - startMs) / 60000));
  }

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  return {
    depTime, arrTime,
    depCode: first.origin.code,
    arrCode: last.destination.code,
    duration: totalMin > 0 ? `${h}h ${m}m` : "",
    stops: segs.length - 1,
  };
}

function getBaggageSummary(offer: DuffelOffer): string {
  const bag = offer.baggageDetails;
  if (!bag) return offer.baggageIncluded || "";

  const parts: string[] = [];

  if (bag.carryOnIncluded) {
    let carryText = `Carry-on ×${bag.carryOnQuantity || 1}`;
    if (bag.carryOnWeightKg) carryText += ` (${bag.carryOnWeightKg}kg)`;
    parts.push(carryText);
  }

  if (bag.checkedBagsIncluded && bag.checkedBagQuantity > 0) {
    let checkedText = `Checked ×${bag.checkedBagQuantity}`;
    if (bag.checkedBagWeightKg && bag.checkedBagWeightLb) {
      checkedText += ` (${bag.checkedBagWeightKg}kg / ${bag.checkedBagWeightLb}lb)`;
    } else if (bag.checkedBagWeightKg) {
      checkedText += ` (${bag.checkedBagWeightKg}kg)`;
    } else if (bag.checkedBagWeightLb) {
      checkedText += ` (${bag.checkedBagWeightLb}lb)`;
    }
    parts.push(checkedText);
  }

  if (parts.length === 0) {
    if (bag.carryOnIncluded) return "Carry-on only";
    return "No bags included";
  }

  return parts.join(" · ");
}

export function FlightSummaryCompact({ offer, search }: { offer: DuffelOffer; search: any }) {
  const isRoundTrip = !!search?.returnDate;
  const segments = offer.segments || [];

  const { outbound, returnSegs } = useMemo(() => {
    if (!isRoundTrip || segments.length === 0) return { outbound: segments, returnSegs: [] };
    const dest = (search.destination || offer.arrival?.code || "").toUpperCase();
    const splitIdx = segments.findIndex((seg: DuffelSegment, i: number) =>
      i > 0 && seg.origin.code.toUpperCase() === dest
    );
    if (splitIdx <= 0) return { outbound: segments, returnSegs: [] };
    return { outbound: segments.slice(0, splitIdx), returnSegs: segments.slice(splitIdx) };
  }, [segments, isRoundTrip, search?.destination, offer.arrival?.code]);

  const outInfo = getSliceInfo(outbound);
  const retInfo = returnSegs.length > 0 ? getSliceInfo(returnSegs) : null;

  const carrierCodes = offer.carriers?.length
    ? [...new Set(offer.carriers.map((c: any) => c.code))].slice(0, 2)
    : [offer.airlineCode];

  const baggageSummary = getBaggageSummary(offer);

  const renderLeg = (info: ReturnType<typeof getSliceInfo>, label: string) => {
    if (!info) return null;
    return (
      <div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
        <div className="flex items-center gap-2.5">
          <div className="min-w-[48px]">
            <p className="text-[17px] font-bold tabular-nums leading-none tracking-tight">{info.depTime}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{info.depCode}</p>
          </div>

          {/* 3D flight path line */}
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-muted-foreground tabular-nums font-medium">{info.duration}</span>
            <div className="w-full h-[2.5px] rounded-full relative"
              style={{
                background: "linear-gradient(90deg, hsl(var(--flights)) 0%, hsl(var(--flights) / 0.2) 50%, hsl(var(--flights)) 100%)",
                boxShadow: "0 1px 4px hsl(var(--flights) / 0.2)",
              }}
            >
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full border-2 border-card"
                style={{
                  background: "hsl(var(--flights))",
                  boxShadow: "0 0 6px hsl(var(--flights) / 0.4)",
                }}
              />
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full border-2 border-card"
                style={{
                  background: "hsl(var(--flights))",
                  boxShadow: "0 0 6px hsl(var(--flights) / 0.4)",
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground font-medium">
              {info.stops === 0 ? "Direct" : `${info.stops} stop${info.stops > 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="text-right min-w-[48px]">
            <p className="text-[17px] font-bold tabular-nums leading-none tracking-tight">{info.arrTime}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{info.arrCode}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="relative mb-5 overflow-hidden rounded-2xl"
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border) / 0.3)",
          boxShadow: `
            0 1px 0 0 hsl(var(--flights) / 0.05),
            0 8px 24px -8px hsl(var(--foreground) / 0.08),
            0 20px 48px -12px hsl(var(--foreground) / 0.04),
            inset 0 1px 0 0 hsl(0 0% 100% / 0.06)
          `,
          transform: "perspective(600px) rotateX(0.5deg)",
        }}
      >
        {/* Top glow accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2.5px]"
          style={{ background: "linear-gradient(90deg, transparent 5%, hsl(var(--flights)) 50%, transparent 95%)" }}
        />

        <div className="p-4">
          {/* Airline + Price header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="relative shrink-0 rounded-xl p-0.5"
                style={{
                  boxShadow: "0 3px 10px -2px hsl(var(--foreground) / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
                  width: carrierCodes.length > 1 ? 48 : 38,
                  height: 38,
                }}
              >
                <AirlineLogo iataCode={carrierCodes[0]} airlineName={offer.airline} size={36} className="border border-border/15 shadow-sm rounded-lg" />
                {carrierCodes.length > 1 && (
                  <AirlineLogo iataCode={carrierCodes[1]} airlineName="" size={22} className="absolute bottom-0 right-0 border-2 border-card shadow-sm rounded-md" />
                )}
              </div>
              <div>
                <p className="text-[14px] font-semibold leading-tight">{offer.airline}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{offer.flightNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-xl font-bold tabular-nums leading-tight tracking-tight"
                style={{ color: "hsl(var(--flights))" }}
              >
                ${Math.round(getAllInPrice(offer.price)).toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground font-medium">{isRoundTrip ? "round trip" : "one way"}</p>
            </div>
          </div>

          {/* Outbound leg */}
          {outInfo && renderLeg(outInfo, retInfo ? "Outbound" : "Flight")}

          {/* Return leg */}
          {retInfo && (
            <div
              className="mt-3.5 pt-3.5"
              style={{ borderTop: "1.5px dashed hsl(var(--border) / 0.25)" }}
            >
              {renderLeg(retInfo, "Return")}
            </div>
          )}

          {/* Fare badges — 3D pill chips */}
          <div className="flex gap-1.5 mt-4 pt-3 flex-wrap" style={{ borderTop: "1px solid hsl(var(--border) / 0.15)" }}>
            <Badge
              variant="outline"
              className="text-[8px] h-[20px] px-2 capitalize font-medium rounded-lg"
              style={{
                background: "hsl(var(--muted) / 0.25)",
                border: "1px solid hsl(var(--border) / 0.25)",
                boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.03)",
              }}
            >
              {offer.cabinClass?.replace("_", " ") || "Economy"}
            </Badge>

            {isRoundTrip && (
              <Badge
                variant="outline"
                className="text-[8px] h-[20px] px-2 font-medium rounded-lg"
                style={{
                  background: "hsl(var(--flights) / 0.06)",
                  border: "1px solid hsl(var(--flights) / 0.15)",
                  color: "hsl(var(--flights))",
                  boxShadow: "0 1px 3px hsl(var(--flights) / 0.06)",
                }}
              >
                Round trip
              </Badge>
            )}

            {offer.fareBrandName && (
              <Badge
                variant="outline"
                className="text-[8px] h-[20px] px-2 font-medium rounded-lg"
                style={{
                  background: "hsl(var(--muted) / 0.25)",
                  border: "1px solid hsl(var(--border) / 0.25)",
                  boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.03)",
                }}
              >
                {offer.fareBrandName}
              </Badge>
            )}

            {baggageSummary && (
              <Badge
                variant="outline"
                className="text-[8px] h-[20px] px-2 font-medium rounded-lg"
                style={{
                  background: "hsl(var(--muted) / 0.25)",
                  border: "1px solid hsl(var(--border) / 0.25)",
                  boxShadow: "inset 0 1px 2px hsl(var(--foreground) / 0.03)",
                }}
              >
                {baggageSummary}
              </Badge>
            )}

            {offer.conditions?.refundable && (
              <Badge
                variant="outline"
                className="text-[8px] h-[20px] px-2 font-medium rounded-lg"
                style={{
                  background: "hsl(142 71% 45% / 0.06)",
                  border: "1px solid hsl(142 71% 45% / 0.15)",
                  color: "hsl(142 71% 35%)",
                }}
              >
                Refundable
              </Badge>
            )}
            {offer.conditions?.changeable && (
              <Badge
                variant="outline"
                className="text-[8px] h-[20px] px-2 font-medium rounded-lg"
                style={{
                  background: "hsl(199 89% 48% / 0.06)",
                  border: "1px solid hsl(199 89% 48% / 0.15)",
                  color: "hsl(199 89% 38%)",
                }}
              >
                Changeable
              </Badge>
            )}
          </div>

          {(offer.conditions?.changePenalty || offer.conditions?.refundPenalty) && (
            <div className="mt-2 flex gap-3 text-[8px] text-muted-foreground/70">
              {offer.conditions.changePenalty != null && offer.conditions.changePenalty > 0 && (
                <span>Change fee: ${offer.conditions.changePenalty} {offer.conditions.penaltyCurrency}</span>
              )}
              {offer.conditions.refundPenalty != null && offer.conditions.refundPenalty > 0 && (
                <span>Cancel fee: ${offer.conditions.refundPenalty} {offer.conditions.penaltyCurrency}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
