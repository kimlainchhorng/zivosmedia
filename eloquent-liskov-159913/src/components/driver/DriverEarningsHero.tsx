/**
 * DriverEarningsHero - iOS 2026 earnings card with animated numbers
 * Ported from Zivo Driver Connect's NextGenHero
 */
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Target, Clock, MapPin, Star, Award, HandCoins } from "lucide-react";

interface DriverEarningsHeroProps {
  isOnline: boolean;
  todayEarnings: number;
  todayDeliveries: number;
  hoursOnline: number;
  targetEarnings?: number;
  rating?: number;
  todayTips?: number;
}

const AnimatedNumber = ({ value, prefix = "", suffix = "", decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startRef = useRef(0);
  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    startRef.current = displayValue;
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(startRef.current + (value - startRef.current) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span>{prefix}{displayValue.toFixed(decimals)}{suffix}</span>;
};

export default function DriverEarningsHero({
  isOnline, todayEarnings, todayDeliveries,
  hoursOnline, targetEarnings = 150, rating = 4.70, todayTips = 0,
}: DriverEarningsHeroProps) {
  const progress = Math.min((todayEarnings / targetEarnings) * 100, 100);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const miniStats = [
    { label: "TRIPS", value: `${todayDeliveries}`, icon: MapPin, accent: "--primary", highlight: false },
    { label: "TIPS", value: `$${todayTips.toFixed(0)}`, icon: HandCoins, accent: "--primary", highlight: true },
    { label: "HOURS", value: `${hoursOnline.toFixed(1)}`, icon: Clock, accent: "--muted-foreground", highlight: false },
    { label: "RATING", value: `${rating.toFixed(2)}`, icon: Star, accent: "--primary", highlight: true },
    { label: "GOAL", value: `${progress.toFixed(0)}%`, icon: Award, accent: "--primary", highlight: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-[18px] overflow-hidden relative"
      style={{
        background: "hsl(var(--card) / 0.85)",
        backdropFilter: "saturate(180%) blur(24px)",
        WebkitBackdropFilter: "saturate(180%) blur(24px)",
        border: "0.5px solid hsl(var(--border) / 0.2)",
        boxShadow: "0 4px 24px -8px hsl(0 0% 0% / 0.08), 0 1px 3px -1px hsl(0 0% 0% / 0.04)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        />
      </div>

      <div className="px-4 pt-3 pb-3 relative z-10">
        {/* Greeting + Status */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[12px] text-muted-foreground font-medium">
              {getGreeting()} 👋
            </span>
            <h2 className="text-[18px] font-extrabold text-foreground tracking-tight leading-tight">
              {isOnline ? "You're earning!" : "Ready to earn?"}
            </h2>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: isOnline ? "hsl(var(--primary) / 0.08)" : "hsl(var(--muted) / 0.5)",
              border: `0.5px solid ${isOnline ? "hsl(var(--primary) / 0.2)" : "hsl(var(--border) / 0.25)"}`,
            }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: isOnline ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.35)" }}
              animate={isOnline ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            <span className="text-[10px] font-bold tracking-wide"
              style={{ color: isOnline ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
              {isOnline ? "LIVE" : "OFF"}
            </span>
          </div>
        </div>

        {/* Today's Earnings */}
        <div className="flex items-end justify-between mb-1">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] mb-0.5 font-semibold">
              Today's Earnings
            </p>
            <span className="text-[36px] font-black tracking-tight leading-none block"
              style={{ color: "hsl(var(--primary))" }}>
              <AnimatedNumber value={todayEarnings} prefix="$" decimals={2} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mb-1"
            style={{ background: "hsl(var(--primary) / 0.08)", border: "0.5px solid hsl(var(--primary) / 0.18)" }}>
            <HandCoins className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
            <span className="text-[11px] font-bold" style={{ color: "hsl(var(--primary))" }}>
              Tips: <AnimatedNumber value={todayTips} prefix="$" decimals={0} />
            </span>
          </div>
        </div>

        {/* Goal */}
        <div className="mt-1.5 mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-[11px] font-semibold text-foreground">Goal</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: "hsl(var(--primary))" }}>
              ${todayEarnings.toFixed(0)} / ${targetEarnings}
            </span>
          </div>
          <div className="h-[5px] rounded-full overflow-hidden relative"
            style={{ background: "hsl(var(--muted) / 0.3)" }}>
            <motion.div className="absolute inset-y-0 left-0 rounded-full"
              initial={{ width: 0 }} animate={{ width: `${progress}%` }}
              transition={{ duration: 1.4, delay: 0.5, type: "spring", stiffness: 60 }}
              style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))", boxShadow: "0 0 8px hsl(var(--primary) / 0.3)" }}
            />
          </div>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-5 gap-1.5">
          {miniStats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-2 rounded-[10px]"
              style={{
                background: stat.highlight ? `hsl(var(${stat.accent}) / 0.08)` : "hsl(var(--muted) / 0.25)",
                border: stat.highlight ? `0.5px solid hsl(var(${stat.accent}) / 0.18)` : "0.5px solid hsl(var(--border) / 0.08)",
              }}>
              <stat.icon className="w-3.5 h-3.5 mb-0.5"
                style={{ color: stat.highlight ? `hsl(var(${stat.accent}))` : "hsl(var(--muted-foreground) / 0.45)" }} />
              <span className="text-[14px] font-bold text-foreground leading-none">{stat.value}</span>
              <span className="text-[7px] font-semibold uppercase tracking-wider mt-0.5 leading-none"
                style={{ color: "hsl(var(--muted-foreground) / 0.5)" }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
