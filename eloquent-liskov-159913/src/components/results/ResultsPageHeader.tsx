/**
 * Results Page Header
 * Global header for all results pages (Flights, Hotels, Cars)
 * Affiliate-safe messaging with trust signals
 */

import { Info, Shield, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResultsPageHeaderProps {
  service: "flights" | "hotels" | "cars";
  className?: string;
}

const serviceConfig = {
  flights: {
    color: "text-sky-500",
    bgLight: "bg-sky-500/5",
    border: "border-sky-500/20",
  },
  hotels: {
    color: "text-amber-500",
    bgLight: "bg-amber-500/5",
    border: "border-amber-500/20",
  },
  cars: {
    color: "text-primary",
    bgLight: "bg-primary/5",
    border: "border-primary/20",
  },
};

export function ResultsPageHeader({ service, className }: ResultsPageHeaderProps) {
  const config = serviceConfig[service];

  return (
    <div
      className={cn(
        "rounded-xl p-4 border mb-6",
        config.bgLight,
        config.border,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Shield className={cn("w-5 h-5 mt-0.5 shrink-0", config.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Compare prices from multiple trusted travel providers.
          </p>
          <p className="text-sm text-foreground/90 mt-0.5">
            Choose a provider to complete your booking securely.
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                    <Info className="w-3 h-3" />
                    Prices may change until booking is completed with the provider.
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="text-xs">
                    Prices are provided by travel partners and may change until booking is completed on the provider's site.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * How ZIVO Works - Mini Section
 * Shows the 3-step booking flow
 */
export function HowZivoWorks({ className }: { className?: string }) {
  const steps = [
    { number: 1, text: "Search and compare prices" },
    { number: 2, text: "Choose a trusted travel partner" },
    { number: 3, text: "Complete booking securely on the partner site" },
  ];

  return (
    <div className={cn("rounded-xl p-4 bg-muted/30 border border-border/50", className)}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        How ZIVO Works
      </h3>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.number} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{step.number}</span>
            </div>
            <span className="text-sm text-muted-foreground">{step.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Filter Note
 * Shows below filter section to clarify filters adjust partner results
 */
export function FilterNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] text-muted-foreground italic mt-4 px-1", className)}>
      Filters adjust partner-provided results only.
    </p>
  );
}

export default ResultsPageHeader;
