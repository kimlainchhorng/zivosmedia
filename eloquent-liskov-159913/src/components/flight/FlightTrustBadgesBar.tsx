/**
 * Flight Trust Badges Bar
 * Displays trust signals for compliance and user confidence
 */

import { Shield, Eye, BadgeCheck, Lock, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightTrustBadgesBarProps {
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

const badges = [
  {
    icon: Lock,
    label: "Secure ZIVO Checkout",
    color: "text-emerald-500",
  },
  {
    icon: Eye,
    label: "Real-Time Prices",
    color: "text-sky-500",
  },
  {
    icon: BadgeCheck,
    label: "No Hidden Fees from ZIVO",
    color: "text-amber-500",
  },
  {
    icon: Smartphone,
    label: "Mobile-Friendly Booking",
    color: "text-purple-500",
  },
];

export default function FlightTrustBadgesBar({ className, variant = 'default' }: FlightTrustBadgesBarProps) {
  if (variant === 'card') {
    return (
      <div className={cn(
        "p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3",
        className
      )}>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="w-4 h-4 text-foreground" />
          <span>Booking with confidence</span>
        </div>
        <div className="grid gap-2">
          {badges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2 text-sm text-muted-foreground">
              <badge.icon className={cn("w-4 h-4 shrink-0", badge.color)} />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground", className)}>
        {badges.map((badge) => (
          <span key={badge.label} className="flex items-center gap-1.5">
            <badge.icon className={cn("w-3.5 h-3.5", badge.color)} />
            {badge.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "py-5 border-y border-border/50 bg-gradient-to-r from-muted/20 via-muted/30 to-muted/20",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          {badges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center",
                badge.color === "text-emerald-500" && "bg-emerald-500/10",
                badge.color === "text-sky-500" && "bg-sky-500/10",
                badge.color === "text-amber-500" && "bg-amber-500/10",
                badge.color === "text-purple-500" && "bg-purple-500/10",
              )}>
                <badge.icon className={cn("w-4.5 h-4.5", badge.color)} />
              </div>
              <span className="text-sm font-medium">{badge.label}</span>
            </div>
          ))}
        </div>
        {/* Footer trust note */}
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          ZIVO sells tickets as a sub-agent of licensed ticketing providers
        </p>
      </div>
    </div>
  );
}
