/**
 * GroceryRecentStores — horizontal scroll with glassmorphic glow cards
 * Uses localStorage to persist recent store slugs.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { getStoresForMarket } from "@/config/groceryStores";
import { getStoreStatus } from "@/utils/storeStatus";
import { useCountry } from "@/hooks/useCountry";
import { useMemo, useEffect, useState } from "react";

const STORAGE_KEY = "zivo_recent_stores";
const MAX_RECENT = 6;

export function addRecentStore(slug: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const updated = [slug, ...existing.filter((s) => s !== slug)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function GroceryRecentStores() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const marketStores = useMemo(() => getStoresForMarket(country), [country]);
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setSlugs(stored);
    } catch {}
  }, []);

  const stores = useMemo(
    () => slugs.map((s) => marketStores.find((st) => st.slug === s)).filter(Boolean),
    [slugs, marketStores]
  );

  if (stores.length === 0) return null;

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Recent</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{stores.length} visited</span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {stores.map((store, i) => {
          const status = getStoreStatus(store!.hours);
          return (
            <motion.button
              key={store!.slug}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring" as const, stiffness: 300, damping: 22 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => navigate(`/grocery/store/${store!.slug}`)}
              className="group flex flex-col items-center gap-1.5 shrink-0 relative"
            >
              <div className="relative">
                {/* Glow ring on hover */}
                <div className="absolute inset-0 rounded-2xl bg-primary/0 group-hover:bg-primary/10 blur-md transition-all duration-300" />
                <div className="relative h-14 w-14 rounded-2xl bg-card border border-border/40 flex items-center justify-center p-2 shadow-sm group-hover:shadow-lg group-hover:border-primary/25 transition-all duration-200">
	                  <img src={store!.logo} alt={store!.name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                </div>
                {/* Status indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                  {status.isOpen && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ring-2 ring-background ${status.isOpen ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                </span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors w-14 text-center truncate">
                {store!.name}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
