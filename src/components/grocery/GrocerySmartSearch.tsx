/**
 * GrocerySmartSearch — autocomplete with recent searches & real store matches only
 * No fake trending items for non-existent stores
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Store, ArrowRight, X, Clock, TrendingUp, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getStoresForMarket } from "@/config/groceryStores";
import { useCountry } from "@/hooks/useCountry";

const RECENT_KEY = "zivo_grocery_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

function addRecentSearch(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return;
  const existing = getRecentSearches();
  const updated = [trimmed, ...existing.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

// Only real store categories for trending
const TRENDING = [
  { query: "Milk & Dairy", store: "walmart", icon: "🥛" },
  { query: "Fresh Produce", store: "kroger", icon: "🥬" },
  { query: "Snacks & Chips", store: "costco", icon: "🍿" },
  { query: "Frozen Meals", store: "target", icon: "🧊" },
  { query: "Bakery & Bread", store: "walmart", icon: "🍞" },
  { query: "Beverages", store: "kroger", icon: "🥤" },
];

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function GrocerySmartSearch({ value, onChange }: Props) {
  const navigate = useNavigate();
  const { country } = useCountry();
  const marketStores = useMemo(() => getStoresForMarket(country), [country]);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();

  useEffect(() => {
    if (isFocused) setRecentSearches(getRecentSearches());
  }, [isFocused]);

  const storeResults = query
    ? marketStores.filter((s) => s.name.toLowerCase().includes(query)).slice(0, 3)
    : [];

  const trendingResults = query
    ? TRENDING.filter((p) => p.query.toLowerCase().includes(query)).slice(0, 3)
    : TRENDING.slice(0, 4);

  const showDropdown = isFocused && (storeResults.length > 0 || trendingResults.length > 0 || recentSearches.length > 0 || !query);

  const handleNavigate = useCallback((slug: string, searchQuery?: string) => {
    if (searchQuery) addRecentSearch(searchQuery);
    navigate(`/grocery/store/${slug}`);
    setIsFocused(false);
    onChange("");
  }, [navigate, onChange]);

  const clearRecent = useCallback(() => {
    localStorage.removeItem(RECENT_KEY);
    setRecentSearches([]);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="px-4 pb-2 relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          ref={inputRef}
          placeholder="Search stores & products…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-10 pr-9 rounded-2xl bg-muted/30 border-border/20 h-11 text-sm focus:bg-muted/50 transition-colors"
          aria-label="Search stores and products"
        />
        {value && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.8 }}
            onClick={() => { onChange(""); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-muted/60 hover:bg-muted transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 28 }}
            className="absolute left-4 right-4 top-[calc(100%-2px)] z-50 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl shadow-background/60 overflow-hidden max-h-[60vh] overflow-y-auto"
          >
            {/* Recent searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> Recent
                  </p>
                  <button type="button" onClick={clearRecent} className="text-[9px] text-destructive hover:underline font-medium">Clear</button>
                </div>
                {recentSearches.map((term) => (
                  <motion.button
                    key={term}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      onChange(term);
                      setIsFocused(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-7 w-7 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <p className="text-[12px] font-medium text-foreground flex-1 text-left">{term}</p>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Store matches */}
            {storeResults.length > 0 && (
              <div className={`p-2 ${!query && recentSearches.length > 0 ? "border-t border-border/20" : ""}`}>
                <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Store className="h-2.5 w-2.5" /> Stores
                </p>
                {storeResults.map((store) => (
                  <motion.button
                    key={store.slug}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleNavigate(store.slug, store.name)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-background border border-border/30 flex items-center justify-center p-1 shrink-0">
	                      <img src={store.logo} alt={store.name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[12px] font-semibold text-foreground">{store.name}</p>
                      <p className="text-[10px] text-muted-foreground">{store.deliveryMin}m delivery · {store.hours}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Trending / product suggestions — real stores only */}
            {trendingResults.length > 0 && (
              <div className={`p-2 ${storeResults.length > 0 || (!query && recentSearches.length > 0) ? "border-t border-border/20" : ""}`}>
                <p className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  {query ? <><Sparkles className="h-2.5 w-2.5" /> Suggestions</> : <><TrendingUp className="h-2.5 w-2.5" /> Popular Categories</>}
                </p>
                {trendingResults.map((product) => {
                  const store = marketStores.find((s) => s.slug === product.store);
                  return (
                    <motion.button
                      key={product.query}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleNavigate(product.store, product.query)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm">
                        {product.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[12px] font-medium text-foreground">{product.query}</p>
                        {store && <p className="text-[10px] text-muted-foreground">at {store.name}</p>}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
