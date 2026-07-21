/**
 * CallQualityBadge — Displays real-time call connection quality
 */
import { motion } from "framer-motion";
import type { CallQualityStats } from "@/hooks/useCallQuality";

interface CallQualityBadgeProps {
  stats: CallQualityStats;
  expanded?: boolean;
}

const qualityConfig = {
  excellent: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Excellent", bars: 4 },
  good: { color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Good", bars: 3 },
  fair: { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "Fair", bars: 2 },
  poor: { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Poor", bars: 1 },
};

export default function CallQualityBadge({ stats, expanded = false }: CallQualityBadgeProps) {
  const config = qualityConfig[stats.quality];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border backdrop-blur-sm ${config.bg} text-[11px] font-semibold ${config.color}`}
    >
      {/* Signal bars */}
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            className={`w-[3px] rounded-[1px] transition-colors ${
              bar <= config.bars ? "bg-current" : "bg-current/15"
            }`}
            style={{ height: `${bar * 2.5 + 3}px` }}
          />
        ))}
      </div>
      
      {expanded ? (
        <div className="flex flex-col gap-0.5">
          <span>{config.label}</span>
          <span className="text-[9px] opacity-70">
            {stats.bitrate}kbps · {stats.roundTripTime}ms · {stats.packetLoss}% loss
          </span>
        </div>
      ) : (
        <span>{config.label}</span>
      )}
    </motion.div>
  );
}