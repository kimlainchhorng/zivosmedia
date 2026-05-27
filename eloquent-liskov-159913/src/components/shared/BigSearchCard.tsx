import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

/**
 * BIG SEARCH CARD
 * Large, prominent search form container
 * Professional quality - first thing user sees
 */

export type ServiceType = "flights" | "hotels" | "cars";

const serviceStyles = {
  flights: {
    accentBar: "from-sky-500 via-cyan-500 to-blue-500",
    glowColor: "shadow-sky-500/20",
    borderHover: "hover:ring-sky-500/30",
  },
  hotels: {
    accentBar: "from-amber-500 via-orange-500 to-yellow-500",
    glowColor: "shadow-amber-500/20",
    borderHover: "hover:ring-amber-500/30",
  },
  cars: {
    accentBar: "from-violet-500 via-purple-500 to-fuchsia-500",
    glowColor: "shadow-violet-500/20",
    borderHover: "hover:ring-violet-500/30",
  },
};

interface BigSearchCardProps {
  service: ServiceType;
  children: ReactNode;
  className?: string;
}

export default function BigSearchCard({
  service,
  children,
  className,
}: BigSearchCardProps) {
  const styles = serviceStyles[service];

  return (
    <Card className={cn(
      "max-w-5xl mx-auto overflow-hidden border-0",
      "bg-card/95 backdrop-blur-xl",
      "shadow-2xl ring-1 ring-white/10",
      styles.glowColor,
      styles.borderHover,
      "transition-all duration-200",
      className
    )}>
      {/* Colorful accent bar at top */}
      <div className={cn("h-1.5 bg-gradient-to-r", styles.accentBar)} />
      
      <CardContent className="p-5 sm:p-6 lg:p-8">
        {children}
        
        {/* Affiliate disclosure */}
        <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ExternalLink className="w-3.5 h-3.5" />
          <span>You will be redirected to our trusted partner to complete your booking</span>
        </div>
      </CardContent>
    </Card>
  );
}
