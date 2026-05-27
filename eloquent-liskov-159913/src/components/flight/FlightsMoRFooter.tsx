/**
 * Flights Partner Footer
 * 
 * Affiliate-safe messaging - no MoR language
 * Required on all flight results/checkout pages
 */

import { Shield, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { FLIGHT_DISCLAIMERS } from "@/config/flightCompliance";

interface FlightsPartnerFooterProps {
  className?: string;
  variant?: 'full' | 'compact' | 'inline';
}

export default function FlightsMoRFooter({ 
  className,
  variant = 'full' 
}: FlightsPartnerFooterProps) {
  if (variant === 'inline') {
    return (
      <p className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground",
        className
      )}>
        <Plane className="w-3.5 h-3.5 text-foreground" />
        {FLIGHT_DISCLAIMERS.ticketingShort}
      </p>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "py-4 text-center border-t border-border/50",
        className
      )}>
        <p className="text-xs text-muted-foreground max-w-2xl mx-auto">
          {FLIGHT_DISCLAIMERS.ticketingShort}
        </p>
      </div>
    );
  }

  // Full variant - for page footer
  return (
    <section className={cn(
      "py-8 border-t border-border/50 bg-muted/20",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center">
            <Shield className="w-5 h-5 text-foreground" />
          </div>
          <h3 className="font-semibold text-sm">Trusted Travel Partners</h3>
        </div>
        
        <p className="text-xs text-muted-foreground max-w-3xl mx-auto text-center leading-relaxed">
          {FLIGHT_DISCLAIMERS.ticketing}
        </p>
        
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            Secure partner checkout
          </span>
          <span className="text-border">•</span>
          <span>Prices may change until booking is completed</span>
        </div>
      </div>
    </section>
  );
}
