/**
 * OTA Price Breakdown Component
 * Transparent, itemized pricing display for checkout
 * Shows base fare, taxes, fees, and add-ons
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Info, CheckCircle2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FEE_DISCLOSURE, formatPrice, type ProductType } from "@/config/pricing";

export interface PriceLineItem {
  id: string;
  label: string;
  amount: number;
  type: "base" | "tax" | "fee" | "addon" | "discount" | "subtotal" | "total";
  tooltip?: string;
  isOptional?: boolean;
  isIncluded?: boolean;
  strikethrough?: boolean;
}

interface PriceBreakdownProps {
  items: PriceLineItem[];
  currency?: string;
  productType?: ProductType;
  showExpandedByDefault?: boolean;
  showNoHiddenFees?: boolean;
  className?: string;
}

export function PriceBreakdown({
  items,
  currency = "USD",
  productType = "flights",
  showExpandedByDefault = true,
  showNoHiddenFees = true,
  className,
}: PriceBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(showExpandedByDefault);
  
  const total = items.find(i => i.type === "total");
  const regularItems = items.filter(i => i.type !== "total");
  
  const getItemStyle = (type: PriceLineItem["type"]) => {
    switch (type) {
      case "discount":
        return "text-emerald-600 dark:text-emerald-400";
      case "fee":
        return "text-muted-foreground";
      case "tax":
        return "text-muted-foreground";
      case "addon":
        return "text-blue-600 dark:text-blue-400";
      case "total":
        return "font-bold text-lg";
      default:
        return "";
    }
  };

  return (
    <div className={cn("rounded-2xl border border-border bg-card/50 transition-all duration-200", className)}>
      {/* Header */}
      <button type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200 touch-manipulation active:scale-[0.99] rounded-2xl min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold">Price Breakdown</span>
        </div>
        <div className="flex items-center gap-3">
          {total && (
            <span className="text-lg font-bold">
              {formatPrice(total.amount, currency)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      
      <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
        <div className="px-4 pb-4 space-y-2">
          {/* Line items */}
          {regularItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between text-sm py-1",
                getItemStyle(item.type)
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className={cn(item.strikethrough && "line-through opacity-50")}>
                  {item.label}
                </span>
                {item.tooltip && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3.5 h-3.5 text-muted-foreground/50 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-[200px]">{item.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {item.isOptional && (
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    Optional
                  </span>
                )}
              </div>
              <span className={cn(item.strikethrough && "line-through opacity-50")}>
                {item.type === "discount" ? "-" : ""}
                {formatPrice(Math.abs(item.amount), currency)}
              </span>
            </div>
          ))}
          
          {/* Total divider */}
          <div className="border-t border-border my-2" />
          
          {/* Total */}
          {total && (
            <div className="flex items-center justify-between font-bold text-base pt-1">
              <span>{total.label}</span>
              <span className="text-lg">{formatPrice(total.amount, currency)}</span>
            </div>
          )}
          
          {/* No hidden fees message */}
          {showNoHiddenFees && (
            <div className="flex items-center gap-2 pt-3 border-t border-border/50 mt-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-muted-foreground">
                {FEE_DISCLOSURE.noHiddenFees}
              </span>
            </div>
          )}
          
          {/* Product-specific disclosure */}
          <p className="text-[10px] text-muted-foreground/70 pt-2">
            {FEE_DISCLOSURE[productType]}
          </p>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version
interface CompactPriceProps {
  total: number;
  originalTotal?: number;
  currency?: string;
  label?: string;
  className?: string;
}

export function CompactPrice({
  total,
  originalTotal,
  currency = "USD",
  label = "Total",
  className,
}: CompactPriceProps) {
  const hasDiscount = originalTotal && originalTotal > total;
  
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        {hasDiscount && (
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(originalTotal, currency)}
          </span>
        )}
        <span className="text-xl font-bold">
          {formatPrice(total, currency)}
        </span>
      </div>
    </div>
  );
}

export default PriceBreakdown;
