/**
 * GroceryDealsSection - Shows top-rated & best-value products (real data only)
 * No fake discounts — highlights real ratings and low prices
 */
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Plus, Check, Package, Star, Award } from "lucide-react";
import type { StoreProduct } from "@/hooks/useStoreSearch";
import { useMemo, useState } from "react";

interface GroceryDealsSectionProps {
  products: StoreProduct[];
  onAdd: (product: StoreProduct) => void;
  cartProductIds: Set<string>;
}

export function GroceryDealsSection({ products, onAdd, cartProductIds }: GroceryDealsSectionProps) {
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Show best-value products: in stock, has rating, sorted by rating then price
  const bestPicks = useMemo(() => {
    return products
      .filter((p) => p.inStock && p.price > 0 && p.rating != null && p.rating > 0)
      .sort((a, b) => {
        const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return a.price - b.price;
      })
      .slice(0, 12);
  }, [products]);

  if (bestPicks.length < 3) return null;

  const handleAdd = (p: StoreProduct) => {
    onAdd(p);
    setAddedIds((prev) => new Set(prev).add(p.productId));
    setTimeout(() => setAddedIds((prev) => { const next = new Set(prev); next.delete(p.productId); return next; }), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="pt-4 pb-1"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-4">
        <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-400/5">
          <Award className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-foreground tracking-tight">Top Rated</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 text-[8px] font-bold">
              ★ Best picks
            </span>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">Scroll →</span>
      </div>

      {/* Products carousel */}
      <div
        className="flex gap-2.5 overflow-x-auto pb-2 px-4 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {bestPicks.map((p, i) => {
          const inCart = cartProductIds.has(p.productId);
          const justAdded = addedIds.has(p.productId);
          const isTopRated = (p.rating ?? 0) >= 4.5;

          return (
            <motion.div
              key={p.productId}
              initial={{ opacity: 0, x: 16, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
              className="snap-start shrink-0 w-[145px] rounded-2xl border border-amber-200/30 bg-card overflow-hidden group hover:border-amber-300/40 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300"
            >
              <div className="relative h-[105px] bg-gradient-to-br from-amber-50/30 to-muted/20 dark:from-amber-950/10 flex items-center justify-center p-3">
                {p.image ? (
                  <img
                    src={p.image}
	                    alt={p.name}
	                    className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
	                    loading="lazy"
	                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground/10" />
                )}

                {/* Rating badge */}
                {p.rating != null && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/20 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[9px] font-bold text-foreground">{p.rating}</span>
                  </div>
                )}

                {/* Top rated badge */}
                {isTopRated && (
                  <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-amber-500/90 text-white shadow-sm">
                    <TrendingUp className="h-2 w-2" />
                    <span className="text-[8px] font-bold">TOP</span>
                  </div>
                )}

                {/* Stock dot */}
                <span className="absolute bottom-1.5 left-1.5 h-2 w-2 rounded-full bg-emerald-500 border border-background shadow-sm" />
              </div>

              <div className="p-2.5 space-y-1.5">
                <p className="text-[10px] font-semibold line-clamp-2 text-foreground/90 leading-snug min-h-[24px]">{p.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-extrabold text-foreground">${p.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  {p.brand && (
                    <span className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wide truncate max-w-[70px]">
                      {p.brand}
                    </span>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => handleAdd(p)}
                    className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      inCart || justAdded
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                        : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15"
                    }`}
                  >
                    <AnimatePresence mode="wait">
                      {justAdded ? (
                        <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check className="h-3 w-3" />
                        </motion.div>
                      ) : (
                        <motion.div key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Plus className="h-3 w-3" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
