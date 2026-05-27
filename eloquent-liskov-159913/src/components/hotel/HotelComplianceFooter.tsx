/**
 * Hotel Compliance Footer
 * 
 * Required disclaimer text for hotel booking pages.
 * Shows partner disclosure and booking info.
 */

import { Shield, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface HotelComplianceFooterProps {
  className?: string;
  variant?: 'full' | 'compact' | 'inline';
}

export default function HotelComplianceFooter({ 
  className,
  variant = 'full' 
}: HotelComplianceFooterProps) {
  const text = "Hotel bookings are completed with licensed accommodation partners.";

  if (variant === 'inline') {
    return (
      <p className={cn(
        "text-xs text-muted-foreground flex items-center gap-1.5",
        className
      )}>
        <Info className="w-3 h-3 shrink-0" />
        {text}
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
          {text}
        </p>
      </div>
    );
  }

  // Full variant
  return (
    <section className={cn(
      "py-6 border-t border-border/50 bg-muted/10",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-hotels" />
          <span className="text-sm font-medium">Booking Information</span>
        </div>
        
        <p className="text-xs text-muted-foreground max-w-3xl mx-auto text-center leading-relaxed">
          {text}{' '}
          ZIVO compares prices from multiple hotel partners to help you find the best rates.{' '}
          Prices may change until booking is completed on the partner site.{' '}
          <Link to="/partner-disclosure" className="underline hover:text-foreground">
            Partner Disclosure
          </Link>
          {' · '}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms
          </Link>
          {' · '}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy
          </Link>
        </p>
      </div>
    </section>
  );
}
