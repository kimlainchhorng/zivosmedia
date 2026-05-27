/**
 * GroceryProductCard - 2026 Spatial UI product card (v8)
 * Real data only - no fake savings/discounts
 */
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Check, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StoreProduct } from "@/hooks/useStoreSearch";
import type { GroceryCartItem } from "@/hooks/useGroceryCart";
import { useState } from "react";
import { GROCERY_STORES } from "@/config/groceryStores";

interface GroceryProductCardProps {
  product: StoreProduct;
  index: number;
  cartItem?: GroceryCartItem;
  onAdd: (product: StoreProduct) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onSelect?: (product: StoreProduct) => void;
}

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.02, type: "spring" as const, stiffness: 320, damping: 26 },
  }),
};

function getStoreLogo(storeName: string): string | undefined {
  const store = GROCERY_STORES.find((s) => s.name.toLowerCase() === storeName.toLowerCase());
  return store?.logo;
}

export function GroceryProductCard({
  product,
  index,
  cartItem,
  onAdd,
  onUpdateQuantity,
  onSelect,
}: GroceryProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleAdd = () => {
    onAdd(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 600);
  };

  const storeLogo = getStoreLogo(product.store);

  return (
    <motion.div
      custom={index}
      variants={cardVariant}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className={`group relative rounded-2xl bg-card border transition-all duration-300 overflow-hidden ${
        cartItem
          ? "border-primary/30 shadow-md shadow-primary/10 ring-1 ring-primary/10"
          : "border-border/30 hover:border-primary/15 hover:shadow-xl hover:shadow-primary/5"
      }`}
    >
      {/* Image */}
      <div
        className="relative aspect-[4/3.5] bg-gradient-to-br from-muted/5 to-muted/20 flex items-center justify-center p-3 overflow-hidden cursor-pointer"
        onClick={() => onSelect?.(product)}
      >
        {product.image && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 bg-muted/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
            )}
            <motion.img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              referrerPolicy="no-referrer"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: imgLoaded ? 1 : 0.92, opacity: imgLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <Package className="h-8 w-8 text-muted-foreground/10" />
        )}

        {/* Stock dot */}
        <span className={`absolute top-1.5 left-1.5 h-2 w-2 rounded-full border border-background shadow-sm ${
          product.inStock ? "bg-emerald-500" : "bg-destructive"
        }`} />

        {/* Store logo */}
        {storeLogo && (
          <div className="absolute top-1 right-1 h-5 w-5 rounded-md bg-background/90 backdrop-blur-sm border border-border/30 flex items-center justify-center p-0.5">
	            <img src={storeLogo} alt={product.store} className="h-full w-full object-contain" loading="lazy" decoding="async" />
          </div>
        )}

        {/* Cart badge with counter */}
        <AnimatePresence>
          {cartItem && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute bottom-1.5 right-1.5 h-6 min-w-[24px] px-1 rounded-full bg-primary flex items-center justify-center ring-2 ring-background shadow-lg shadow-primary/30"
            >
              <motion.span
                key={cartItem.quantity}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="text-[9px] font-extrabold text-primary-foreground"
              >
                {cartItem.quantity}
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating */}
        {product.rating != null && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/85 backdrop-blur-sm">
            <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[8px] font-bold text-foreground">{product.rating}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1">
        {/* Brand */}
        {product.brand && (
          <p className="text-[8px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {product.brand}
          </p>
        )}

        <p
          className="text-[11px] font-semibold line-clamp-2 leading-snug text-foreground/90 min-h-[28px] cursor-pointer hover:text-primary transition-colors duration-200"
          onClick={() => onSelect?.(product)}
        >
          {product.name}
        </p>

        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-[14px] font-extrabold text-foreground tracking-tight">
            ${typeof product.price === "number" ? product.price.toFixed(2) : product.price}
          </span>
        </div>

        {/* CTA */}
        {!product.inStock ? (
          <div className="text-[9px] text-muted-foreground text-center py-2 rounded-xl bg-muted/30 font-medium">
            Out of Stock
          </div>
        ) : cartItem ? (
          <div className="flex items-center justify-between bg-primary/10 rounded-xl p-0.5 border border-primary/15">
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => onUpdateQuantity(product.productId, cartItem.quantity - 1)}
              className="h-7 w-7 rounded-lg bg-background flex items-center justify-center border border-border/20 hover:bg-muted/50 transition-colors"
              aria-label="Decrease"
            >
              <Minus className="h-3 w-3" />
            </motion.button>
            <motion.span
              key={cartItem.quantity}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              className="text-[12px] font-extrabold text-primary min-w-[20px] text-center"
            >
              {cartItem.quantity}
            </motion.span>
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => onUpdateQuantity(product.productId, cartItem.quantity + 1)}
              className="h-7 w-7 rounded-lg bg-background flex items-center justify-center border border-border/20 hover:bg-muted/50 transition-colors"
              aria-label="Increase"
            >
              <Plus className="h-3 w-3" />
            </motion.button>
          </div>
        ) : (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              className="w-full rounded-xl text-[10px] h-8 font-bold gap-1 shadow-sm"
              onClick={handleAdd}
              aria-label={`Add ${product.name}`}
            >
              <AnimatePresence mode="wait">
                {justAdded ? (
                  <motion.span key="added" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                    <Check className="h-3 w-3" /> Added!
                  </motion.span>
                ) : (
                  <motion.span key="add" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
