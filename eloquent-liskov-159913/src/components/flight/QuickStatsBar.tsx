/**
 * Quick Stats Bar — Native app-style summary pills
 * Cheapest / Fastest / Best Value — compact horizontal layout
 */

import { Plane, Clock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface QuickStat {
  price: number;
  airline?: string;
  duration?: string;
}

interface QuickStatsBarProps {
  cheapest: QuickStat;
  fastest: QuickStat;
  bestValue: QuickStat;
  currency?: string;
  className?: string;
}

export function QuickStatsBar({
  cheapest,
  fastest,
  bestValue,
  currency = "USD",
  className,
}: QuickStatsBarProps) {
  const formatPrice = (price: number) => {
    const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
    return `${symbols[currency] || '$'}${price.toLocaleString()}`;
  };

  const stats = [
    {
      label: "CHEAPEST",
      icon: Plane,
      price: cheapest.price,
      airline: cheapest.airline,
      duration: cheapest.duration,
      gradient: "from-emerald-500/10 to-emerald-500/[0.02]",
      accentLine: "bg-emerald-500",
      iconColor: "text-emerald-500",
      priceColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "FASTEST",
      icon: Clock,
      price: fastest.price,
      airline: fastest.airline,
      duration: fastest.duration,
      gradient: "from-muted to-muted",
      accentLine: "bg-violet-500",
      iconColor: "text-violet-500",
      priceColor: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "BEST VALUE",
      icon: Star,
      price: bestValue.price,
      airline: bestValue.airline,
      duration: bestValue.duration,
      gradient: "from-amber-500/10 to-amber-500/[0.02]",
      accentLine: "bg-amber-500",
      iconColor: "text-amber-500",
      priceColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className={cn("space-y-1.5", className)}>
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl bg-gradient-to-r overflow-hidden",
            stat.gradient,
          )}
          style={{
            boxShadow: "0 1px 3px -1px hsl(var(--foreground) / 0.04)",
          }}
        >
          {/* Left accent line */}
          <div className={cn("absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full", stat.accentLine, "opacity-60")} />

          {/* Icon */}
          <div className={cn(
            "shrink-0 w-8 h-8 flex items-center justify-center rounded-lg",
            "bg-card/60 border border-border/20",
          )}>
            <stat.icon className={cn("w-4 h-4", stat.iconColor)} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
              {stat.label}
            </p>
            <p className={cn("text-base font-extrabold tabular-nums leading-tight mt-0.5", stat.priceColor)}>
              {formatPrice(stat.price)}
            </p>
          </div>

          {/* Airline + duration on right */}
          {stat.airline && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-medium text-muted-foreground truncate max-w-[100px]">
                {stat.airline}
              </p>
              {stat.duration && (
                <p className="text-[9px] text-muted-foreground/50 mt-0.5">{stat.duration}</p>
              )}
            </div>
          )}
        </motion.div>
      ))}

      {/* Subtle inline notice */}
      <p className="text-center text-[9px] text-muted-foreground/40 pt-0.5">
        Final prices shown — tickets issued instantly after payment.
      </p>
    </div>
  );
}

export default QuickStatsBar;
