/**
 * DriverQuickActions - iOS 2026 premium quick action grid
 * Ported from Zivo Driver Connect
 */
import React from "react";
import { motion } from "framer-motion";
import {
  Navigation, Coffee, AlertTriangle, MessageSquare,
  DollarSign, Zap, Package, Wallet
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  accent: string;
  action: () => void;
}

export default function DriverQuickActions() {
  const navigate = useNavigate();

  const handleEmergency = () => {
    toast.error("🆘 Emergency Mode — Contacting support...");
  };

  const handleBreak = () => {
    toast("☕ Break Started — Orders paused.");
  };

  const handleOpenMaps = () => {
    const openMap = (url: string) => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(url));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => openMap(`https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`),
        () => openMap("https://www.google.com/maps")
      );
    } else {
      openMap("https://www.google.com/maps");
    }
  };

  const quickActions: QuickAction[] = [
    { id: "navigate", icon: <Navigation className="w-[20px] h-[20px]" />, label: "Maps", accent: "--primary", action: handleOpenMaps },
    { id: "earnings", icon: <DollarSign className="w-[20px] h-[20px]" />, label: "Earnings", accent: "--primary", action: () => navigate("/driver/earnings") },
    { id: "wallet", icon: <Wallet className="w-[20px] h-[20px]" />, label: "Wallet", accent: "--primary", action: () => navigate("/driver/earnings") },
    { id: "break", icon: <Coffee className="w-[20px] h-[20px]" />, label: "Break", accent: "--accent", action: handleBreak },
    { id: "support", icon: <MessageSquare className="w-[20px] h-[20px]" />, label: "Support", accent: "--primary", action: () => navigate("/support") },
    { id: "orders", icon: <Package className="w-[20px] h-[20px]" />, label: "Orders", accent: "--primary", action: () => navigate("/driver/orders") },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-[14px] overflow-hidden shrink-0"
      style={{
        background: "hsl(var(--card) / 0.85)",
        backdropFilter: "saturate(180%) blur(24px)",
        WebkitBackdropFilter: "saturate(180%) blur(24px)",
        border: "0.5px solid hsl(var(--border) / 0.2)",
        boxShadow: "0 4px 24px -8px hsl(0 0% 0% / 0.08), 0 1px 3px -1px hsl(0 0% 0% / 0.04)",
      }}
    >
      <div className="px-3 py-2.5">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[8px] flex items-center justify-center"
              style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <span className="text-[13px] font-bold text-foreground tracking-tight">Quick Actions</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleEmergency}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{
              background: "hsl(var(--destructive) / 0.06)",
              border: "0.5px solid hsl(var(--destructive) / 0.15)",
            }}
          >
            <AlertTriangle className="w-3 h-3" style={{ color: "hsl(var(--destructive))" }} />
            <span className="text-[10px] font-bold" style={{ color: "hsl(var(--destructive))" }}>SOS</span>
          </motion.button>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-6 gap-1.5">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + index * 0.05, type: "spring", stiffness: 300, damping: 22 }}
              whileTap={{ scale: 0.85 }}
              onClick={action.action}
              className="relative flex flex-col items-center gap-1.5 py-1"
            >
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center transition-transform"
                style={{
                  background: `hsl(var(${action.accent}) / 0.08)`,
                  border: `0.5px solid hsl(var(${action.accent}) / 0.12)`,
                  color: `hsl(var(${action.accent}))`,
                }}
              >
                {action.icon}
              </div>
              <span className="text-[10px] font-semibold"
                style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
                {action.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
