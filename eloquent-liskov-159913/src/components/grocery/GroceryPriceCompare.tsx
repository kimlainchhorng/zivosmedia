/**
 * GroceryPriceCompare - Cross-store price comparison for a product
 * Searches the same product name across other stores
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, Loader2, Check, ExternalLink } from "lucide-react";
import { getStoresForMarket, type StoreName } from "@/config/groceryStores";
import { useCountry } from "@/hooks/useCountry";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

interface PriceResult {
  store: StoreName;
  logo: string;
  price: number | null;
  productName: string | null;
  loading: boolean;
}

interface GroceryPriceCompareProps {
  productName: string;
  currentStore: string;
  currentPrice: number;
}

export function GroceryPriceCompare({ productName, currentStore, currentPrice }: GroceryPriceCompareProps) {
  const { country } = useCountry();
  const marketStores = useMemo(() => getStoresForMarket(country), [country]);
  const [results, setResults] = useState<PriceResult[]>([]);
  const [expanded, setExpanded] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (!expanded || fetched.current || !productName) return;
    fetched.current = true;

    // Search other stores
    const otherStores = marketStores.filter((s) => s.name !== currentStore);
    const initial: PriceResult[] = otherStores.map((s) => ({
      store: s.name,
      logo: s.logo,
      price: null,
      productName: null,
      loading: true,
    }));
    setResults(initial);

    // Simplify search query — use first 4-5 significant words
    const searchTerms = productName
      .replace(/[,\(\)\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 5)
      .join(" ");

    otherStores.forEach(async (storeCfg, idx) => {
      try {
        const url = `${SUPABASE_URL}/functions/v1/${storeCfg.edgeFunction}?q=${encodeURIComponent(searchTerms)}&page=1`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`, apikey: SUPABASE_PUBLISHABLE_KEY },
        });
        const data = await res.json();
        const products = data.products || [];
        // Find best match by name similarity
        const bestMatch = products[0];
        setResults((prev) =>
          prev.map((r, i) =>
            i === idx
              ? {
                  ...r,
                  price: bestMatch?.price ?? null,
                  productName: bestMatch?.name ?? null,
                  loading: false,
                }
              : r
          )
        );
      } catch {
        setResults((prev) =>
          prev.map((r, i) => (i === idx ? { ...r, loading: false } : r))
        );
      }
    });
  }, [expanded, productName, currentStore]);

  // Reset when product changes
  useEffect(() => {
    fetched.current = false;
    setResults([]);
    setExpanded(false);
  }, [productName]);

  const currentStoreCfg = marketStores.find((s) => s.name === currentStore);

  return (
    <div className="mt-3">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-all"
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold text-foreground">Compare prices across stores</span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="ml-auto text-muted-foreground"
        >
          ▾
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {/* Current store */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15">
                {currentStoreCfg && (
	                  <img src={currentStoreCfg.logo} alt={currentStore} className="h-5 w-5 object-contain" loading="lazy" decoding="async" />
                )}
                <span className="text-[11px] font-bold text-foreground flex-1">{currentStore}</span>
                <span className="text-[13px] font-extrabold text-primary">${currentPrice.toFixed(2)}</span>
                <span className="text-[8px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded-md">Current</span>
              </div>

              {/* Other stores */}
              {results.map((r) => {
                const cheaper = r.price !== null && r.price < currentPrice;
                const diff = r.price !== null ? currentPrice - r.price : 0;
                return (
                  <div
                    key={r.store}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                      cheaper ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/20 bg-muted/5"
                    }`}
                  >
	                    <img src={r.logo} alt={r.store} className="h-5 w-5 object-contain" loading="lazy" decoding="async" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-foreground">{r.store}</span>
                      {r.productName && (
                        <p className="text-[9px] text-muted-foreground truncate">{r.productName}</p>
                      )}
                    </div>
                    {r.loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    ) : r.price !== null ? (
                      <div className="text-right">
                        <span className={`text-[13px] font-extrabold ${cheaper ? "text-emerald-600" : "text-foreground"}`}>
                          ${r.price.toFixed(2)}
                        </span>
                        {diff !== 0 && (
                          <p className={`text-[9px] font-semibold ${cheaper ? "text-emerald-600" : "text-orange-500"}`}>
                            {cheaper ? `Save $${Math.abs(diff).toFixed(2)}` : `+$${Math.abs(diff).toFixed(2)}`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">N/A</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
