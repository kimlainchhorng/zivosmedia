/**
 * DriverQuickStatsBar - iOS 2026 compact stats strip
 * Ported from Zivo Driver Connect
 */
import React, { memo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, DollarSign, Clock, CheckCircle, HandCoins } from "lucide-react";
import { motion } from "framer-motion";

interface DriverQuickStatsBarProps {
  trips: number;
  earnings: number;
  hoursOnline: number;
  acceptanceRate: number;
  tips?: number;
}

const DriverQuickStatsBar = memo(({ trips, earnings, hoursOnline, acceptanceRate, tips = 0 }: DriverQuickStatsBarProps) => {
  const navigate = useNavigate();

  const stats = [
    { label: "TRIPS", value: `${trips}`, icon: MapPin, onClick: () => navigate("/driver/orders") },
    { label: "EARNED", value: `$${earnings.toFixed(0)}`, icon: DollarSign, onClick: () => navigate("/driver/earnings") },
    { label: "TIPS", value: `$${tips.toFixed(0)}`, icon: HandCoins, onClick: () => navigate("/driver/earnings") },
    { label: "HOURS", value: `${hoursOnline.toFixed(1)}h`, icon: Clock, onClick: () => navigate("/driver/performance") },
    { label: "ACCEPT", value: acceptanceRate > 0 ? `${acceptanceRate}%` : "100%", icon: CheckCircle, onClick: () => navigate("/driver/performance") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mx-3 mt-1.5 rounded-[16px] overflow-hidden"
      style={{
        background: "hsl(var(--card) / 0.75)",
        backdropFilter: "saturate(180%) blur(24px)",
        WebkitBackdropFilter: "saturate(180%) blur(24px)",
        border: "0.5px solid hsl(var(--border) / 0.15)",
        boxShadow: "0 2px 12px -4px hsl(0 0% 0% / 0.06)",
      }}
    >
      <div className="flex items-center justify-between py-3 px-1.5">
        {stats.map((stat, i) => (
          <React.Fragment key={stat.label}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={stat.onClick}
              className="flex flex-col items-center gap-1 flex-1 py-0.5"
            >
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                style={{ background: "hsl(var(--primary) / 0.07)" }}
              >
                <stat.icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <span className="text-[14px] font-bold text-foreground leading-none">
                {stat.value}
              </span>
              <span
                className="text-[8px] font-semibold uppercase tracking-widest leading-none"
                style={{ color: "hsl(var(--muted-foreground) / 0.45)" }}
              >
                {stat.label}
              </span>
            </motion.button>
            {i < stats.length - 1 && (
              <div
                className="w-px h-8 shrink-0"
                style={{ background: "hsl(var(--border) / 0.1)" }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
});

DriverQuickStatsBar.displayName = "DriverQuickStatsBar";

export default DriverQuickStatsBar;
