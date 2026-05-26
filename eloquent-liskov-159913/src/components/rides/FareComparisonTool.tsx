/**
 * FareComparisonTool - Compare ride tiers with price history graph
 * Now uses dynamic pricing from useCityPricing (admin DB) instead of hardcoded values.
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Car, Crown, Sparkles, Users, Clock, TrendingDown, TrendingUp, BarChart3, Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCityPricing, type CityPricingRow } from "@/hooks/useCityPricing";

interface FareTier {
  id: string;
  name: string;
  icon: typeof Car;
  price: number;
  originalPrice?: number;
  eta: number;
  surge: number;
  features: string[];
  color: string;
  gradient: string;
  recommended?: boolean;
}

/* Static tier metadata (non-price fields) */
const TIER_META: Omit<FareTier, "price" | "originalPrice">[] = [
  { id: "economy", name: "Economy", icon: Car, eta: 4, surge: 1.0, features: ["4 seats", "Standard car"], color: "text-emerald-500", gradient: "from-emerald-500/10 to-emerald-500/5" },
  { id: "comfort", name: "Comfort", icon: Sparkles, eta: 3, surge: 1.0, features: ["4 seats", "Newer cars", "Extra legroom"], color: "text-primary", gradient: "from-primary/10 to-primary/5", recommended: true },
  { id: "black-lane", name: "Premium", icon: Crown, eta: 5, surge: 1.0, features: ["4 seats", "Luxury vehicle", "Top-rated driver", "Complimentary water"], color: "text-amber-500", gradient: "from-amber-500/10 to-amber-500/5" },
  { id: "share", name: "Shared", icon: Users, eta: 7, surge: 1.0, features: ["Shared ride", "1-2 extra stops", "Best value"], color: "text-sky-500", gradient: "from-muted to-muted" },
];

/* Fallback prices (only used when DB has no data) */
const FALLBACK_PRICES: Record<string, number> = {
  economy: 12.50, comfort: 18.75, "black-lane": 28.00, share: 8.25,
};

/** Estimate a sample fare from DB pricing row (5-mile, 12-min reference trip) */
function sampleFare(row: CityPricingRow): number {
  const dist = 5; // miles
  const dur = 12; // minutes
  const raw = (row.base_fare ?? 0) + (row.per_mile ?? 0) * dist + (row.per_minute ?? 0) * dur + (row.booking_fee ?? 0);
  return Math.max(raw, row.minimum_fare ?? 0);
}

interface FareComparisonToolProps {
  city?: string;
  distanceMiles?: number;
  durationMinutes?: number;
  onSelect?: (tierId: string) => void;
  onPriceAlert?: (tierId: string) => void;
}

export default function FareComparisonTool({ city, distanceMiles = 5, durationMinutes = 12, onSelect, onPriceAlert }: FareComparisonToolProps) {
  const [selected, setSelected] = useState("comfort");
  const [showHistory, setShowHistory] = useState(false);
  const { data: pricingMap } = useCityPricing(city);

  const fareTiers = useMemo<FareTier[]>(() => {
    return TIER_META.map((meta) => {
      const dbRow = pricingMap?.[meta.id];
      let price: number;
      if (dbRow) {
        const dist = distanceMiles;
        const dur = durationMinutes;
        const raw = (dbRow.base_fare ?? 0) + (dbRow.per_mile ?? 0) * dist + (dbRow.per_minute ?? 0) * dur + (dbRow.booking_fee ?? 0);
        price = Math.max(raw, dbRow.minimum_fare ?? 0);
      } else {
        price = FALLBACK_PRICES[meta.id] ?? 10;
      }
      return { ...meta, price: Math.round(price * 100) / 100 };
    });
  }, [pricingMap, distanceMiles, durationMinutes]);

  const lowestPrice = Math.min(...fareTiers.map((t) => t.price));

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Compare Fares</h3>
            <p className="text-[10px] text-muted-foreground">
              {pricingMap && Object.keys(pricingMap).length > 0 ? "Live pricing" : "Estimated pricing"}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[9px] font-bold text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
          <TrendingDown className="w-3 h-3 mr-1" /> Best rates
        </Badge>
      </div>

      {/* Tier cards */}
      <div className="px-4 py-3 space-y-2">
        {fareTiers.map((tier, i) => {
          const Icon = tier.icon;
          const isSelected = selected === tier.id;
          const isCheapest = tier.price === lowestPrice;

          return (
            <motion.button
              key={tier.id}
              onClick={() => setSelected(tier.id)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative",
                isSelected
                  ? `bg-gradient-to-r ${tier.gradient} border-primary/20 ring-2 ring-primary/10`
                  : "bg-muted/10 border-border/20 hover:bg-muted/20"
              )}
            >
              {tier.recommended && (
                <div className="absolute -top-1 right-2 bg-primary text-primary-foreground text-[8px] font-black px-2 py-0.5 rounded-b-md">
                  BEST VALUE
                </div>
              )}

              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", `${tier.color.replace("text-", "bg-")}/10`)}>
                <Icon className={cn("w-5 h-5", tier.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{tier.name}</span>
                  {isCheapest && (
                    <Badge className="text-[8px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">
                      LOWEST
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="w-3 h-3" /> {tier.eta} min
                  </span>
                  <span className="text-[10px] text-muted-foreground">{tier.features[0]}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={cn("text-base font-black", isSelected ? "text-primary" : "text-foreground")}>
                  ${tier.price.toFixed(2)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 text-xs flex-1"
          onClick={() => { onPriceAlert?.(selected); toast.success("Price alert set!"); }}
        >
          <Bell className="w-3.5 h-3.5 mr-1.5" /> Price Alert
        </Button>
        <Button
          size="sm"
          className="h-10 text-xs flex-1 font-bold"
          onClick={() => { onSelect?.(selected); toast.success(`${selected} selected!`); }}
        >
          Select {fareTiers.find((t) => t.id === selected)?.name}
          <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
