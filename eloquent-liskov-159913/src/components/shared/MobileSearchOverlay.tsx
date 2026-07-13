/**
 * Mobile Search Overlay - Full-screen search with smooth animations
 * Provides native-app-like search UX on mobile
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plane, Hotel, CarFront, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickLinks = [
  { icon: Plane, label: "Flights", href: "/flights", color: "text-[hsl(var(--flights))]", bg: "bg-[hsl(var(--flights-light))]" },
  { icon: Hotel, label: "Hotels", href: "/hotels", color: "text-[hsl(var(--hotels))]", bg: "bg-[hsl(var(--hotels-light))]" },
  { icon: CarFront, label: "Cars", href: "/rent-car", color: "text-[hsl(var(--cars))]", bg: "bg-[hsl(var(--cars-light))]" },
];

// Trending searches will be populated from analytics; empty until that
// pipeline exists so we never show fabricated suggestions.
const trending: string[] = [];

export function MobileSearchOverlay({ isOpen, onClose }: MobileSearchOverlayProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSearch = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    if (q.includes("flight") || q.includes("fly")) navigate("/flights");
    else if (q.includes("hotel") || q.includes("stay")) navigate("/hotels");
    else if (q.includes("car") || q.includes("rent")) navigate("/rent-car");
    else if (q.includes("ride") || q.includes("taxi") || q.includes("uber")) navigate("/rides/hub");
    else if (q.includes("food") || q.includes("eat") || q.includes("restaurant") || q.includes("delivery")) navigate("/eats");
    else navigate("/flights");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[60] bg-background safe-area-top safe-area-bottom"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <div className="flex-1 flex items-center gap-2.5 h-12 px-4 rounded-xl bg-muted/50 border border-border/50">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Where are you going?"
                className="flex-1 bg-transparent text-foreground text-base placeholder:text-muted-foreground outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="touch-manipulation active:scale-90">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <button type="button"
              onClick={onClose}
              className="text-sm font-medium text-primary touch-manipulation active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              Cancel
            </button>
          </div>

          {/* Quick Links */}
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Access</p>
            <div className="flex gap-3">
              {quickLinks.map((link) => (
                <button type="button"
                  key={link.label}
                  onClick={() => { navigate(link.href); onClose(); }}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 py-4 rounded-xl border border-border/50",
                    "touch-manipulation active:scale-95 transition-transform"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", link.bg)}>
                    <link.icon className={cn("w-5 h-5", link.color)} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{link.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Trending — hidden until backed by real analytics data */}
          {trending.length > 0 && (
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Trending
              </p>
              <div className="space-y-1">
                {trending.map((item) => (
                  <button type="button"
                    key={item}
                    onClick={() => { setQuery(item); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 touch-manipulation active:scale-[0.98] transition-transform"
                  >
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
