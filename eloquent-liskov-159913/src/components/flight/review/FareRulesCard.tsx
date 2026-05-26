/**
 * Fare Rules & Policies Card — 3D Spatial premium accordion
 * Floating glassmorphic card with depth, perspective, and animated expansion
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, RotateCcw, ArrowRightLeft, Luggage, ShieldCheck,
  AlertCircle, CheckCircle2, XCircle, Package, Briefcase, ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type DuffelOffer } from "@/hooks/useDuffelFlights";

interface FareRulesCardProps {
  offer: DuffelOffer;
}

function PolicyItem({ icon, label, value, allowed, detail }: {
  icon: React.ReactNode; label: string; value: string; allowed: boolean | null; detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={cn(
          "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0",
          allowed === true && "bg-emerald-500/10",
          allowed === false && "bg-destructive/10",
          allowed === null && "bg-muted/40"
        )}
        style={{
          transform: "perspective(200px) rotateX(4deg) rotateY(-2deg)",
          boxShadow: allowed === true
            ? "0 6px 14px -6px hsl(140 60% 50%/0.2), inset 0 1px 0 hsl(var(--background)/0.5)"
            : allowed === false
              ? "0 6px 14px -6px hsl(0 60% 50%/0.15), inset 0 1px 0 hsl(var(--background)/0.5)"
              : "inset 0 1px 2px hsl(var(--foreground)/0.04)",
        }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[12px] font-bold">{label}</p>
          {allowed !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[9px] font-bold border",
                allowed
                  ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "border-destructive/20 text-destructive"
              )}
              style={{
                background: allowed
                  ? "linear-gradient(135deg, hsl(140 60% 50%/0.08), transparent)"
                  : "linear-gradient(135deg, hsl(0 60% 50%/0.06), transparent)",
                boxShadow: "0 2px 6px -3px hsl(var(--foreground)/0.06)",
              }}
            >
              {allowed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {value}
            </span>
          )}
          {allowed === null && (
            <span className="text-[10px] text-muted-foreground font-medium">{value}</span>
          )}
        </div>
        {detail && (
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{detail}</p>
        )}
      </div>
    </div>
  );
}

export function FareRulesCard({ offer }: FareRulesCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isRefundable = offer.isRefundable ?? false;
  const isChangeable = offer.conditions?.changeable ?? false;
  const baggage = offer.baggageIncluded || "Personal item";
  const hasCarryOn = offer.baggageDetails?.carryOnIncluded ?? (baggage.toLowerCase().includes("carry") || baggage.toLowerCase().includes("cabin"));
  const hasCheckedBag = offer.baggageDetails?.checkedBagsIncluded ?? (baggage.toLowerCase().includes("check") || baggage.toLowerCase().includes("kg") || baggage.toLowerCase().includes("pc"));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
      <button type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-muted/20 transition-colors"
      >
        <div
          className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[hsl(var(--flights))]/15 to-[hsl(var(--flights))]/5 flex items-center justify-center shrink-0 text-[hsl(var(--flights))]"
          style={{
            transform: "perspective(200px) rotateX(5deg) rotateY(-3deg)",
            boxShadow: "0 8px 18px -6px hsl(var(--flights)/0.25), inset 0 1px 0 hsl(var(--background)/0.5)",
          }}
        >
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[13px] font-extrabold">Fare Rules & Policies</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
            {isRefundable ? "Refundable" : "Non-refundable"} · {isChangeable ? "Changes allowed" : "No changes"} · {baggage}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRefundable && (
            <span
              className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl px-2 py-0.5"
              style={{ background: "linear-gradient(135deg, hsl(140 60% 50%/0.08), transparent)" }}
            >
              Refundable
            </span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/15">
              <PolicyItem
                icon={<RotateCcw className={cn("w-4 h-4", isRefundable ? "text-emerald-500" : "text-destructive")} />}
                label="Cancellation & Refund"
                value={isRefundable ? "Allowed" : "Non-refundable"}
                allowed={isRefundable}
                detail={isRefundable
                  ? "This fare allows cancellation with refund. Airline fees may apply depending on timing."
                  : "This fare is non-refundable. Taxes may be recoverable depending on the airline."}
              />

              <Separator className="bg-border/10" />

              <PolicyItem
                icon={<ArrowRightLeft className={cn("w-4 h-4", isChangeable ? "text-emerald-500" : "text-destructive")} />}
                label="Date & Route Changes"
                value={isChangeable ? "Allowed" : "Not allowed"}
                allowed={isChangeable}
                detail={isChangeable
                  ? "Date/route changes permitted before departure. Change fees and fare differences may apply."
                  : "This fare does not allow changes. You would need to cancel and rebook."}
              />

              <Separator className="bg-border/10" />

              {/* Baggage Breakdown — 3D cards */}
              <div className="py-3">
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-2xl bg-[hsl(var(--flights))]/10 flex items-center justify-center shrink-0"
                    style={{
                      transform: "perspective(200px) rotateX(4deg) rotateY(-2deg)",
                      boxShadow: "0 6px 14px -6px hsl(var(--flights)/0.2), inset 0 1px 0 hsl(var(--background)/0.5)",
                    }}
                  >
                    <Luggage className="w-4 h-4 text-[hsl(var(--flights))]" />
                  </div>
                  <p className="text-[12px] font-bold">Baggage Allowance</p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 ml-12">
                  {[
                    { icon: ShoppingBag, label: "Personal Item", included: true },
                    { icon: Briefcase, label: "Carry-on", included: hasCarryOn },
                    { icon: Package, label: "Checked Bag", included: hasCheckedBag },
                  ].map(({ icon: BagIcon, label, included }) => (
                    <div
                      key={label}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border-[1.5px]",
                        included ? "border-emerald-500/20" : "border-border/15"
                      )}
                      style={{
                        background: included
                          ? "linear-gradient(145deg, hsl(140 60% 50%/0.06), transparent)"
                          : "linear-gradient(145deg, hsl(var(--muted)/0.3), hsl(var(--muted)/0.1))",
                        boxShadow: included
                          ? "0 4px 12px -4px hsl(140 60% 50%/0.12), inset 0 1px 0 hsl(var(--background)/0.5)"
                          : "inset 0 1px 2px hsl(var(--foreground)/0.03)",
                        transform: "perspective(300px) rotateX(2deg)",
                      }}
                    >
                      <BagIcon className={cn("w-5 h-5", included ? "text-emerald-500" : "text-muted-foreground/30")} />
                      <span className="text-[9px] font-bold text-center leading-tight">{label}</span>
                      {included
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        : <XCircle className="w-3.5 h-3.5 text-muted-foreground/30" />}
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-border/10" />

              <PolicyItem
                icon={<AlertCircle className="w-4 h-4 text-muted-foreground" />}
                label="Seat Selection"
                value="After ticketing"
                allowed={null}
                detail="Seat selection is available after your ticket is issued, directly with the airline."
              />

              {/* Airline rules notice */}
              <div
                className="mt-2 p-3.5 rounded-2xl border border-border/15"
                style={{
                  background: "linear-gradient(145deg, hsl(var(--muted)/0.3), hsl(var(--muted)/0.1))",
                  boxShadow: "inset 0 2px 4px -1px hsl(var(--foreground)/0.04)",
                }}
              >
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Important:</span> Fare rules are set by the airline and may vary by route.
                  Fees for changes, cancellations, or excess baggage are determined by the airline's tariff at time of request.
                  Full fare conditions will be provided at checkout.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
