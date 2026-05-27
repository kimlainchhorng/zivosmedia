/**
 * GroceryFrequentlyBoughtTogether - Product recommendations
 * Shows "frequently bought together" items based on current product
 */
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Check, ShoppingBag, Sparkles, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreProduct } from "@/hooks/useStoreSearch";

interface Props {
  currentProduct: StoreProduct;
  allProducts: StoreProduct[];
  cartProductIds: Set<string>;
  onAddAll: (products: StoreProduct[]) => void;
  onAdd: (product: StoreProduct) => void;
}

export function GroceryFrequentlyBoughtTogether({
  currentProduct,
  allProducts,
  cartProductIds,
  onAddAll,
  onAdd,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pick 2-3 complementary products from same store
  const suggestions = useMemo(() => {
    if (!currentProduct || allProducts.length < 3) return [];
    const candidates = allProducts.filter(
      (p) =>
        p.productId !== currentProduct.productId &&
        p.store === currentProduct.store &&
        p.inStock &&
        Math.abs(p.price - currentProduct.price) < currentProduct.price * 2
    );
    // Shuffle deterministically based on product ID
    const hash = currentProduct.productId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...candidates].sort((a, b) => {
      const ha = a.productId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
      const hb = b.productId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
      return ((ha + hash) % 97) - ((hb + hash) % 97);
    });
    return shuffled.slice(0, 3);
  }, [currentProduct, allProducts]);

  useEffect(() => {
    setSelectedIds(new Set(suggestions.map((s) => s.productId)));
  }, [suggestions]);

  if (suggestions.length < 2) return null;

  const selectedProducts = suggestions.filter((s) => selectedIds.has(s.productId));
  const bundleTotal = currentProduct.price + selectedProducts.reduce((s, p) => s + p.price, 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">Frequently Bought Together</h3>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
        {/* Current product */}
        <div className="shrink-0 w-[90px] rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
          <div className="aspect-square bg-gradient-to-br from-muted/5 to-muted/15 flex items-center justify-center p-2">
            {currentProduct.image ? (
	              <img src={currentProduct.image} alt={currentProduct.name} className="h-full w-full object-contain" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
            ) : (
              <Package className="h-6 w-6 text-muted-foreground/10" />
            )}
          </div>
          <div className="p-1.5 text-center">
            <p className="text-[9px] font-semibold text-foreground/80 line-clamp-1">{currentProduct.name}</p>
            <p className="text-[11px] font-bold text-primary">${currentProduct.price.toFixed(2)}</p>
          </div>
        </div>

        {suggestions.map((prod) => {
          const isSelected = selectedIds.has(prod.productId);
          const inCart = cartProductIds.has(prod.productId);
          return (
            <div key={prod.productId} className="flex items-center gap-2 shrink-0">
              <span className="text-lg text-muted-foreground/30 font-bold">+</span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleSelect(prod.productId)}
                className={`w-[90px] rounded-xl border-2 overflow-hidden transition-all ${
                  isSelected ? "border-primary/30 bg-primary/5" : "border-border/20 opacity-50"
                }`}
              >
                <div className="aspect-square bg-gradient-to-br from-muted/5 to-muted/15 flex items-center justify-center p-2 relative">
                  {prod.image ? (
	                    <img src={prod.image} alt={prod.name} className="h-full w-full object-contain" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground/10" />
                  )}
                  {isSelected && (
                    <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                  {inCart && (
                    <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-emerald-500/90 text-[7px] font-bold text-white">
                      In cart
                    </div>
                  )}
                </div>
                <div className="p-1.5 text-center">
                  <p className="text-[9px] font-semibold text-foreground/80 line-clamp-1">{prod.name}</p>
                  <p className="text-[11px] font-bold text-foreground">${prod.price.toFixed(2)}</p>
                </div>
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Bundle CTA */}
      {selectedProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/15"
        >
          <div>
            <p className="text-[12px] font-bold text-foreground">
              Bundle total: ${bundleTotal.toFixed(2)}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold">
              {selectedProducts.length + 1} items · Same-day delivery
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl text-[11px] h-9 font-bold gap-1.5"
            onClick={() => onAddAll(selectedProducts)}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Add {selectedProducts.length + 1}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
