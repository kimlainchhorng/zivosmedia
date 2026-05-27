/**
 * CheckoutUpsells Component
 * Block displaying available add-ons during checkout
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FLIGHT_UPSELLS, HOTEL_UPSELLS, CAR_UPSELLS, type UpsellProduct } from "@/config/checkoutUpsells";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type ServiceType = "flights" | "hotels" | "cars";

interface CheckoutUpsellsProps {
  serviceType: ServiceType;
  selectedIds: string[];
  onToggle: (id: string) => void;
  className?: string;
}

const UPSELL_MAP: Record<ServiceType, UpsellProduct[]> = {
  flights: FLIGHT_UPSELLS,
  hotels: HOTEL_UPSELLS,
  cars: CAR_UPSELLS,
};

export default function CheckoutUpsells({ serviceType, selectedIds, onToggle, className }: CheckoutUpsellsProps) {
  const upsells = UPSELL_MAP[serviceType] || [];
  if (!upsells.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" />
        Enhance Your Trip
      </div>
      {upsells.map((item, i) => (
        <motion.label
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-start gap-3 p-3 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all duration-200"
        >
          <Checkbox
            checked={selectedIds.includes(item.id)}
            onCheckedChange={() => onToggle(item.id)}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
          <span className="text-sm font-semibold whitespace-nowrap">
            +${item.price.toFixed(2)}
          </span>
        </motion.label>
      ))}
    </div>
  );
}
