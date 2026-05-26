/**
 * GroceryFilters - Advanced filter bottom sheet
 * Price range, brand, rating, dietary filters
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, X, Star, DollarSign, Tag, Leaf, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreProduct } from "@/hooks/useStoreSearch";

const PRICE_RANGES = [
  { label: "Under $5", min: 0, max: 5 },
  { label: "$5–$10", min: 5, max: 10 },
  { label: "$10–$25", min: 10, max: 25 },
  { label: "$25–$50", min: 25, max: 50 },
  { label: "$50+", min: 50, max: Infinity },
];

const RATING_FILTERS = [
  { label: "4★ & up", min: 4 },
  { label: "3★ & up", min: 3 },
];

const DIETARY_FILTERS = [
  { label: "🌿 Organic", keyword: "organic" },
  { label: "🚫 Gluten Free", keyword: "gluten free" },
  { label: "🥛 Dairy Free", keyword: "dairy free" },
  { label: "🌱 Vegan", keyword: "vegan" },
  { label: "💪 Protein", keyword: "protein" },
  { label: "🍯 Sugar Free", keyword: "sugar free" },
];

export interface ActiveFilters {
  priceRange: { min: number; max: number } | null;
  minRating: number | null;
  dietary: string[];
  brands: string[];
}

const EMPTY_FILTERS: ActiveFilters = { priceRange: null, minRating: null, dietary: [], brands: [] };

export function hasActiveFilters(f: ActiveFilters): boolean {
  return f.priceRange !== null || f.minRating !== null || f.dietary.length > 0 || f.brands.length > 0;
}

export function applyFilters(products: StoreProduct[], filters: ActiveFilters): StoreProduct[] {
  return products.filter((p) => {
    if (filters.priceRange) {
      if (p.price < filters.priceRange.min || p.price > filters.priceRange.max) return false;
    }
    if (filters.minRating !== null) {
      if (p.rating === null || p.rating < filters.minRating) return false;
    }
    if (filters.dietary.length > 0) {
      const nameLower = p.name.toLowerCase();
      if (!filters.dietary.some((d) => nameLower.includes(d))) return false;
    }
    if (filters.brands.length > 0) {
      if (!filters.brands.includes(p.brand)) return false;
    }
    return true;
  });
}

interface GroceryFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  filters: ActiveFilters;
  onApply: (filters: ActiveFilters) => void;
  products: StoreProduct[];
}

export function GroceryFilters({ isOpen, onClose, filters, onApply, products }: GroceryFiltersProps) {
  const [draft, setDraft] = useState<ActiveFilters>(filters);

  // Extract unique brands from products
  const topBrands = useMemo(() => {
    const brandCount: Record<string, number> = {};
    products.forEach((p) => {
      if (p.brand) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
    });
    return Object.entries(brandCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([brand]) => brand);
  }, [products]);

  const matchCount = applyFilters(products, draft).length;

  const toggleDietary = (keyword: string) => {
    setDraft((d) => ({
      ...d,
      dietary: d.dietary.includes(keyword)
        ? d.dietary.filter((k) => k !== keyword)
        : [...d.dietary, keyword],
    }));
  };

  const toggleBrand = (brand: string) => {
    setDraft((d) => ({
      ...d,
      brands: d.brands.includes(brand)
        ? d.brands.filter((b) => b !== brand)
        : [...d.brands, brand],
    }));
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
    onApply(EMPTY_FILTERS);
    onClose();
  };

  // Sync draft when opened
  useState(() => {
    setDraft(filters);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border/30 shadow-2xl max-h-[80vh] flex flex-col safe-area-bottom"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/15">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
                <h3 className="text-[15px] font-bold">Filters</h3>
              </div>
              <div className="flex items-center gap-3">
                {hasActiveFilters(draft) && (
                  <button type="button" onClick={handleClear} className="text-[11px] text-destructive font-semibold">
                    Clear All
                  </button>
                )}
                <motion.button whileTap={{ scale: 0.9 }} onClick={onClose} className="p-1.5 rounded-xl bg-muted/30">
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {/* Price Range */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <DollarSign className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[12px] font-bold text-foreground">Price Range</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_RANGES.map((range) => {
                    const active = draft.priceRange?.min === range.min && draft.priceRange?.max === range.max;
                    return (
                      <button type="button"
                        key={range.label}
                        onClick={() => setDraft((d) => ({ ...d, priceRange: active ? null : range }))}
                        className={`px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/20 text-foreground/70 border-border/20 hover:bg-muted/40"
                        }`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[12px] font-bold text-foreground">Rating</span>
                </div>
                <div className="flex gap-1.5">
                  {RATING_FILTERS.map((rf) => {
                    const active = draft.minRating === rf.min;
                    return (
                      <button type="button"
                        key={rf.label}
                        onClick={() => setDraft((d) => ({ ...d, minRating: active ? null : rf.min }))}
                        className={`px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/20 text-foreground/70 border-border/20 hover:bg-muted/40"
                        }`}
                      >
                        {rf.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dietary */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[12px] font-bold text-foreground">Dietary</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_FILTERS.map((df) => {
                    const active = draft.dietary.includes(df.keyword);
                    return (
                      <button type="button"
                        key={df.keyword}
                        onClick={() => toggleDietary(df.keyword)}
                        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                          active
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/20 text-foreground/70 border-border/20 hover:bg-muted/40"
                        }`}
                      >
                        {df.label}
                        {active && <Check className="h-2.5 w-2.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brands */}
              {topBrands.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[12px] font-bold text-foreground">Brands</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {topBrands.map((brand) => {
                      const active = draft.brands.includes(brand);
                      return (
                        <button type="button"
                          key={brand}
                          onClick={() => toggleBrand(brand)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold transition-all border ${
                            active
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/20 text-foreground/70 border-border/20 hover:bg-muted/40"
                          }`}
                        >
                          {brand}
                          {active && <Check className="h-2.5 w-2.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pt-3 pb-6 border-t border-border/15 bg-background">
              <Button onClick={handleApply} className="w-full rounded-2xl h-12 font-bold text-[13px]">
                Show {matchCount} result{matchCount !== 1 ? "s" : ""}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Compact filter trigger button */
export function GroceryFilterButton({
  activeCount,
  onClick,
}: {
  activeCount: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all border ${
        activeCount > 0
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted/30 text-muted-foreground border-border/20 hover:bg-muted/50"
      }`}
    >
      <SlidersHorizontal className="h-3 w-3" />
      <span className="text-[10px] font-semibold">Filter</span>
      {activeCount > 0 && (
        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold">
          {activeCount}
        </span>
      )}
    </motion.button>
  );
}

export { EMPTY_FILTERS };
