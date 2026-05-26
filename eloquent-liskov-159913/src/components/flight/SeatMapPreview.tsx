/**
 * SeatMapPreview — 3D-enhanced cabin visualization
 * Shows a perspective cabin grid with depth and cabin-class coloring
 */

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SeatMapPreviewProps {
  cabinClass: string;
  className?: string;
}

const cabinConfigs: Record<string, {
  label: string; description: string;
  cols: number; rows: number;
  seatSize: string; gap: string;
  accent: string; accentBg: string;
  features: string[];
}> = {
  first: {
    label: "First Class",
    description: "Lie-flat suites · Privacy doors",
    cols: 4, rows: 2,
    seatSize: "w-5 h-4", gap: "gap-1.5",
    accent: "bg-amber-500/70", accentBg: "from-amber-500/10 to-amber-600/5",
    features: ["Suite", "Flat bed", "Dining"],
  },
  business: {
    label: "Business",
    description: "Wider seats · Extra legroom · Lounge",
    cols: 4, rows: 3,
    seatSize: "w-4 h-3.5", gap: "gap-1",
    accent: "bg-[hsl(var(--flights))]/60", accentBg: "from-[hsl(var(--flights))]/10 to-sky-500/5",
    features: ["Recline", "Legroom", "Priority"],
  },
  premium_economy: {
    label: "Premium Economy",
    description: "More legroom · Priority boarding",
    cols: 6, rows: 3,
    seatSize: "w-3 h-2.5", gap: "gap-0.5",
    accent: "bg-primary/50", accentBg: "from-primary/8 to-primary/3",
    features: ["Legroom", "Power"],
  },
  economy: {
    label: "Economy",
    description: "Standard seating",
    cols: 6, rows: 4,
    seatSize: "w-2.5 h-2", gap: "gap-[3px]",
    accent: "bg-muted-foreground/30", accentBg: "from-muted/20 to-muted/5",
    features: ["Standard"],
  },
};

export default function SeatMapPreview({ cabinClass, className }: SeatMapPreviewProps) {
  const normalized = cabinClass.toLowerCase().replace(/\s+/g, "_");
  const config = cabinConfigs[normalized] || cabinConfigs.economy;
  const aisleAfter = config.cols === 6 ? 2 : 1; // aisle after this col index

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn("flex items-start gap-3", className)}
    >
      {/* 3D Cabin grid with perspective */}
      <div
        className={cn(
          "shrink-0 rounded-lg border border-border/20 p-2 relative overflow-hidden",
          "bg-gradient-to-b", config.accentBg
        )}
        style={{
          perspective: "200px",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Subtle cabin depth shadow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-foreground/[0.03] pointer-events-none" />

        {/* Cockpit indicator */}
        <div className="flex justify-center mb-1.5">
          <div className="w-6 h-1 rounded-full bg-muted-foreground/15" />
        </div>

        <div
          className={cn("flex flex-col items-center", config.gap)}
          style={{
            transform: "rotateX(8deg)",
            transformOrigin: "center bottom",
          }}
        >
          {Array.from({ length: config.rows }).map((_, row) => (
            <div key={row} className={cn("flex items-center", config.gap)}>
              {Array.from({ length: config.cols }).map((_, col) => {
                const isWindow = col === 0 || col === config.cols - 1;
                const isHighlighted = row === 0 && isWindow;
                const needsAisle = col === aisleAfter;

                return (
                  <div key={col} className="flex items-center">
                    <div
                      className={cn(
                        config.seatSize,
                        "rounded-[2px] transition-all duration-300",
                        isHighlighted
                          ? cn(config.accent, "shadow-sm shadow-current/20")
                          : "bg-muted-foreground/12 hover:bg-muted-foreground/20"
                      )}
                    />
                    {needsAisle && (
                      <div className={config.cols === 6 ? "w-1.5" : "w-2"} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Exit row indicators */}
        <div className="flex justify-between mt-1.5 px-0.5">
          <div className="w-1 h-1 rounded-full bg-primary/40" />
          <div className="w-1 h-1 rounded-full bg-primary/40" />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 pt-0.5">
        <p className="text-[11px] font-semibold capitalize leading-tight">{config.label}</p>
        <p className="text-[8px] text-muted-foreground mt-0.5 leading-relaxed">{config.description}</p>
        {/* Feature pills */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {config.features.map(f => (
            <span
              key={f}
              className="text-[7px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground font-medium"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
