/**
 * DriverBottomNav - iOS 2026 native tab bar with raised "Go Live" FAB
 * Ported from Zivo Driver Connect
 */
import { Home, Car, Wallet, User, Wifi, WifiOff } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface DriverBottomNavProps {
  isOnline?: boolean;
}

interface RegularTab {
  id: string;
  icon: typeof Home;
  label: string;
  path: string;
  special?: false;
}

interface StatusTab {
  id: "status";
  special: true;
}

type TabItem = RegularTab | StatusTab;

const tabs: TabItem[] = [
  { id: "home", icon: Home, label: "Home", path: "/driver/home" },
  { id: "orders", icon: Car, label: "Orders", path: "/driver/orders" },
  { id: "status", special: true },
  { id: "earnings", icon: Wallet, label: "Earnings", path: "/driver/earnings" },
  { id: "account", icon: User, label: "Profile", path: "/profile" },
];

export default function DriverBottomNav({ isOnline = false }: DriverBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes("/driver/map")) return "status";
    const tab = tabs.find((t) => !t.special && (t as RegularTab).path === path) as RegularTab | undefined;
    return tab?.id || "home";
  };

  const currentTab = getCurrentTab();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "var(--zivo-safe-bottom,0px)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "hsl(var(--background) / 0.78)",
          backdropFilter: "saturate(180%) blur(28px)",
          WebkitBackdropFilter: "saturate(180%) blur(28px)",
          borderTop: "0.33px solid hsl(var(--border) / 0.18)",
        }}
      />

      <div className="relative flex items-end justify-around h-[56px] max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          if (tab.special) {
            const StatusIcon = isOnline ? Wifi : WifiOff;
            return (
              <motion.button
                key={tab.id}
                type="button"
                onClick={() => navigate("/driver/map")}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center -mt-6 z-10"
              >
                <div
                  className="w-[58px] h-[58px] rounded-full flex items-center justify-center relative"
                  style={{
                    background: "hsl(var(--background) / 0.98)",
                    boxShadow: isOnline
                      ? `0 2px 24px -4px hsl(var(--primary) / 0.45), 0 0 0 3.5px hsl(var(--background) / 0.95), 0 8px 20px -6px hsl(0 0% 0% / 0.1)`
                      : `0 2px 20px -4px hsl(0 0% 0% / 0.12), 0 0 0 3.5px hsl(var(--background) / 0.95), 0 6px 16px -6px hsl(0 0% 0% / 0.06)`,
                  }}
                >
                  <motion.div
                    className="w-[46px] h-[46px] rounded-full flex items-center justify-center"
                    style={{
                      background: isOnline
                        ? "linear-gradient(145deg, hsl(var(--primary)), hsl(152 55% 30%))"
                        : "hsl(var(--muted) / 0.8)",
                    }}
                    animate={isOnline ? {} : { scale: [1, 1.03, 1] }}
                    transition={isOnline ? {} : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  >
                    <StatusIcon
                      className="w-[22px] h-[22px]"
                      style={{
                        color: isOnline
                          ? "hsl(var(--primary-foreground))"
                          : "hsl(var(--muted-foreground))",
                      }}
                      strokeWidth={2}
                      fill={isOnline ? "currentColor" : "none"}
                    />
                  </motion.div>

                  {isOnline && (
                    <motion.div
                      className="absolute top-0.5 right-0.5 w-[10px] h-[10px] rounded-full"
                      style={{
                        background: "hsl(142 76% 36%)",
                        border: "2px solid hsl(var(--background))",
                      }}
                      animate={{ scale: [1, 1.25, 1], opacity: [1, 0.8, 1] }}
                      transition={{ repeat: Infinity, duration: 1.8 }}
                    />
                  )}
                </div>

                <span
                  className="text-[10px] font-semibold mt-0.5 tracking-tight"
                  style={{
                    color: isOnline
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted-foreground) / 0.7)",
                  }}
                >
                  {isOnline ? "Live" : "Go Live"}
                </span>
              </motion.button>
            );
          }

          const regularTab = tab as RegularTab;
          const isActive = currentTab === regularTab.id;
          const Icon = regularTab.icon;

          return (
            <motion.button
              key={regularTab.id}
              type="button"
              onClick={() => navigate(regularTab.path)}
              whileTap={{ scale: 0.88 }}
              className="relative flex flex-col items-center justify-center py-1 px-2 min-w-[56px]"
            >
              <div className="relative flex items-center justify-center h-7">
                <motion.div
                  animate={isActive ? { y: -1 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Icon
                    className="w-[22px] h-[22px] transition-colors duration-200"
                    style={{
                      color: isActive
                        ? "hsl(var(--primary))"
                        : "hsl(var(--muted-foreground) / 0.55)",
                    }}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    fill={isActive ? "currentColor" : "none"}
                  />
                </motion.div>
              </div>
              <span
                className="text-[10px] tracking-tight transition-colors duration-200"
                style={{
                  color: isActive
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted-foreground) / 0.5)",
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {regularTab.label}
              </span>

              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="driverActiveTabDot"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-[4px] h-[4px] rounded-full mt-[1px]"
                    style={{ background: "hsl(var(--primary))" }}
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
