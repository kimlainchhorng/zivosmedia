/**
 * ZIVO Currency Selector
 * Global currency picker that syncs with CurrencyContext
 */

import { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

import bgCurrency from "@/assets/bg-currency-selector.jpg";

import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CurrencySelectorProps {
  variant?: "dropdown" | "inline" | "compact";
  className?: string;
}

const CurrencySelector = ({ variant = "dropdown", className }: CurrencySelectorProps) => {
  const { currency, currencyConfig, setCurrency, currencies } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  // Inline variant: horizontal button group
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {currencies.slice(0, 6).map((curr) => (
          <button type="button"
            key={curr.code}
            onClick={() => setCurrency(curr.code)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150",
              currency === curr.code
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            {curr.flag} {curr.code}
          </button>
        ))}
      </div>
    );
  }

  // Compact variant: just flag + code, smaller touch target
  if (variant === "compact") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "relative gap-1.5 px-3 h-9 text-white font-bold rounded-2xl overflow-hidden shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/30 transition-all duration-300 hover:scale-[1.06] hover:shadow-xl active:scale-[0.97]",
              className
            )}
          >
	            <img src={bgCurrency} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-800/60 to-teal-600/50" />
            <span className="text-base relative z-10 drop-shadow-md">{currencyConfig.flag}</span>
            <span className="text-xs font-bold relative z-10 drop-shadow-md">{currency}</span>
            <ChevronDown className={cn(
              "w-3 h-3 transition-transform duration-200 relative z-10 drop-shadow-md",
              isOpen && "rotate-180"
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-1 bg-card/95 backdrop-blur-xl border-border/50 shadow-xl rounded-2xl overflow-hidden" 
          align="end"
          sideOffset={8}
        >
          <div className="overflow-y-auto max-h-[360px] p-1">
            {currencies.map((curr) => (
              <button type="button"
                key={curr.code}
                onClick={() => {
                  setCurrency(curr.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors",
                  currency === curr.code
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-lg">{curr.flag}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{curr.code}</p>
                  <p className="text-xs text-muted-foreground">{curr.name}</p>
                </div>
                {currency === curr.code && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Default dropdown variant
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 px-3 rounded-xl hover:bg-muted/50 transition-all duration-150",
            className
          )}
        >
          <span className="text-lg">{currencyConfig.flag}</span>
          <span className="font-medium">{currency}</span>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-2xl overflow-hidden" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="p-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">Select Currency</p>
          </div>
        </div>
        
        {/* Currency list */}
        <ScrollArea className="max-h-[360px]">
          <div className="p-2">
            {currencies.map((curr) => (
              <button type="button"
                key={curr.code}
                onClick={() => {
                  setCurrency(curr.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                  currency === curr.code
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "hover:bg-muted"
                )}
              >
                <span className="text-xl">{curr.flag}</span>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{curr.code}</p>
                    <span className="text-xs text-muted-foreground">{curr.symbol}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{curr.name}</p>
                </div>
                {currency === curr.code && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
        
        {/* Footer note */}
        <div className="p-2 border-t border-border/50 bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Prices converted for display only
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CurrencySelector;
