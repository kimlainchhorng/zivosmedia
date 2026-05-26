/**
 * Price Summary Card — 3D Spatial premium breakdown
 * Base fare includes card processing + ZIVO booking fee automatically
 */
import { motion } from "framer-motion";
import { Sparkles, ArrowRightLeft, Users, Tag, Building2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type DuffelOffer } from "@/hooks/useDuffelFlights";
import { calculateFlightPricing } from "@/utils/flightPricing";

interface PriceSummaryCardProps {
  offer: DuffelOffer;
  searchParams: Record<string, any>;
  totalPassengers: number;
  isRoundTrip: boolean;
  stateCode?: string;
}

export function PriceSummaryCard({ offer, searchParams, totalPassengers, isRoundTrip, stateCode }: PriceSummaryCardProps) {
  const pricing = calculateFlightPricing(
    offer.pricePerPerson || offer.price,
    totalPassengers,
    offer.currency || "USD",
    stateCode,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border-[1.5px] border-[hsl(var(--flights))]/20"
      style={{
        background: "hsl(var(--card))",
        boxShadow: `0 24px 48px -16px hsl(var(--flights)/0.1),
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

      <div className="p-5 space-y-4 relative">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(var(--flights))]/15 to-[hsl(var(--flights))]/5 text-[hsl(var(--flights))]"
              style={{
                transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
                boxShadow: "0 8px 18px -6px hsl(var(--flights)/0.25), inset 0 1px 0 hsl(var(--background)/0.5)",
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-[13px] font-extrabold">Price Summary</p>
          </div>
          <div
            className="flex items-center gap-1 rounded-xl border border-emerald-500/20 px-2.5 py-1"
            style={{
              background: "linear-gradient(135deg, hsl(140 60% 50%/0.08), transparent)",
              boxShadow: "0 3px 8px -3px hsl(140 60% 50%/0.15)",
            }}
          >
            <Tag className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">All-in price</span>
          </div>
        </div>

        {/* Trip details */}
        <div className="space-y-2.5">
          {isRoundTrip && (
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <ArrowRightLeft className="w-3 h-3" /> Trip type
              </span>
              <span className="font-semibold">Round trip</span>
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Base fare per traveler
            </span>
            <span className="font-bold tabular-nums">${pricing.baseFare.toFixed(2)}</span>
          </div>

          {totalPassengers > 1 && (
            <>
              <Separator className="bg-border/15" />
              {searchParams.adults > 0 && (
                <div className="flex justify-between text-[11px] pl-5">
                  <span className="text-muted-foreground">Adult × {searchParams.adults}</span>
                  <span className="font-medium tabular-nums">${(pricing.baseFare * searchParams.adults).toFixed(2)}</span>
                </div>
              )}
              {searchParams.children > 0 && (
                <div className="flex justify-between text-[11px] pl-5">
                  <span className="text-muted-foreground">Child × {searchParams.children}</span>
                  <span className="font-medium tabular-nums">${(pricing.baseFare * searchParams.children).toFixed(2)}</span>
                </div>
              )}
              {searchParams.infants > 0 && (
                <div className="flex justify-between text-[11px] pl-5">
                  <span className="text-muted-foreground">Infant × {searchParams.infants}</span>
                  <span className="font-medium tabular-nums">${(pricing.baseFare * searchParams.infants).toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <Separator className="bg-border/20" />

        {/* Subtotal breakdown — recessed 3D panel */}
        <div
          className="rounded-2xl border border-border/15 p-3.5 space-y-2"
          style={{
            background: "linear-gradient(145deg, hsl(var(--muted)/0.35), hsl(var(--muted)/0.15))",
            boxShadow: `inset 0 2px 4px -1px hsl(var(--foreground)/0.04),
                         inset 0 -1px 0 hsl(var(--background)/0.5),
                         0 1px 2px -1px hsl(var(--foreground)/0.02)`,
          }}
        >
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Base fare</span>
            <span className="font-medium tabular-nums">${pricing.baseFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground flex items-center gap-0.5">
              <Building2 className="w-2.5 h-2.5" /> Taxes, Fees & Charges
            </span>
            <span className="font-medium tabular-nums">${pricing.taxesFeesCharges.toFixed(2)}</span>
          </div>
        </div>

        {/* Total — hero price */}
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-sm font-extrabold">Total</span>
          <div className="text-right">
            <motion.span
              key={pricing.totalAllPassengers}
              initial={{ scale: 0.95, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-[1.8rem] font-black text-[hsl(var(--flights))] tabular-nums tracking-tight leading-none"
              style={{
                textShadow: "0 4px 20px hsl(var(--flights)/0.25)",
              }}
            >
              ${pricing.totalAllPassengers.toFixed(2)}
            </motion.span>
            <p className="text-[9px] text-muted-foreground mt-1 font-medium">
              {pricing.currency} · All fees included
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
