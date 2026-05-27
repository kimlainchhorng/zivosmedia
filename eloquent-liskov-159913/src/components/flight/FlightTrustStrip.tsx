/**
 * Flight Trust Strip - OTA Model
 * Always-visible trust indicators for ZIVO Flights
 * Shows above results to build user confidence
 */

import { Lock, Ticket, BadgeCheck, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlightTrustStripProps {
  className?: string;
  variant?: 'default' | 'compact';
}

const trustItems = [
  { 
    icon: Lock, 
    label: "Secure ZIVO Checkout", 
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  { 
    icon: Ticket, 
    label: "Tickets Issued Instantly", 
    color: "text-sky-500",
    bgColor: "bg-sky-500/10"
  },
  { 
    icon: BadgeCheck, 
    label: "No Hidden Fees", 
    color: "text-amber-500",
    bgColor: "bg-amber-500/10"
  },
  { 
    icon: Headphones, 
    label: "24/7 Customer Support", 
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
];

export default function FlightTrustStrip({ className, variant = 'default' }: FlightTrustStripProps) {
  const isCompact = variant === 'compact';
  
  return (
    <section className={cn(
      "border-b border-border/50 bg-gradient-to-r from-primary/5 via-transparent to-primary/5",
      isCompact ? "py-2.5" : "py-3",
      className
    )}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "flex flex-wrap items-center justify-center",
          isCompact ? "gap-3 sm:gap-4" : "gap-4 sm:gap-6 md:gap-8"
        )}>
          {trustItems.map((item) => (
            <div 
              key={item.label} 
              className={cn(
                "flex items-center gap-1.5",
                isCompact ? "text-xs" : "text-sm"
              )}
            >
              <div className={cn(
                "flex items-center justify-center rounded-full",
                isCompact ? "w-5 h-5" : "w-6 h-6",
                item.bgColor
              )}>
                <item.icon className={cn(
                  isCompact ? "w-3 h-3" : "w-3.5 h-3.5",
                  item.color
                )} />
              </div>
              <span className="font-medium text-foreground/80 hidden sm:inline">
                {item.label}
              </span>
              {/* Mobile: shortened labels */}
              <span className="font-medium text-foreground/80 sm:hidden text-[11px]">
                {item.label.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
