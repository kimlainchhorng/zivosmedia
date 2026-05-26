/**
 * Source Badge Component
 * Displays the supplier source for hotel results
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PropertySource } from "@/types/zivoProperty";

interface SourceBadgeProps {
  source: PropertySource;
  className?: string;
  size?: "sm" | "default";
}

const sourceConfig: Record<PropertySource, { label: string; color: string }> = {
  HOTELBEDS: {
    label: "Hotelbeds",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  RATEHAWK: {
    label: "RateHawk",
    color: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
};

export function SourceBadge({ source, className, size = "default" }: SourceBadgeProps) {
  const config = sourceConfig[source];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        config.color,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}

interface BestPriceBadgeProps {
  className?: string;
  size?: "sm" | "default";
}

export function BestPriceBadge({ className, size = "default" }: BestPriceBadgeProps) {
  return (
    <Badge
      className={cn(
        "font-semibold",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        "border-0",
        // Using semantic success colors from design system
        "bg-hotels text-primary-foreground hover:bg-hotels/90",
        className
      )}
    >
      Best Price
    </Badge>
  );
}

interface AvailabilityBadgeProps {
  status: "AVAILABLE" | "ON_REQUEST" | "SOLD_OUT";
  className?: string;
  size?: "sm" | "default";
}

export function AvailabilityBadge({ status, className, size = "default" }: AvailabilityBadgeProps) {
  const statusConfig = {
    AVAILABLE: {
      label: "Available",
      color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    ON_REQUEST: {
      label: "On Request",
      color: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
    SOLD_OUT: {
      label: "Sold Out",
      color: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
        config.color,
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
