/**
 * GroceryProductDetail - 2026 Spatial UI product detail drawer
 * Real data only - no fake savings/markups
 */
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Plus, Minus, Check, Package, Star, MapPin, ShieldCheck,
  Truck, Clock, Info, ChevronRight, ChevronDown, Heart, Barcode,
  Ruler, Box, Leaf, Zap, RotateCcw, Tag, ShoppingBag, ClipboardList, Share2,
} from "lucide-react";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { Button } from "@/components/ui/button";
import type { StoreProduct } from "@/hooks/useStoreSearch";
import type { GroceryCartItem } from "@/hooks/useGroceryCart";
import { useState, useMemo } from "react";
import { GROCERY_STORES } from "@/config/groceryStores";
import { GroceryPriceCompare } from "@/components/grocery/GroceryPriceCompare";
import { GroceryFrequentlyBoughtTogether } from "@/components/grocery/GroceryFrequentlyBoughtTogether";
import { useShoppingList } from "@/hooks/useShoppingList";
import { toast } from "sonner";

interface GroceryProductDetailProps {
  product: StoreProduct | null;
  cartItem?: GroceryCartItem;
  onClose: () => void;
  onAdd: (product: StoreProduct) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  allProducts?: StoreProduct[];
  onSelect?: (product: StoreProduct) => void;
}

function getStoreLogo(storeName: string): string | undefined {
  const store = GROCERY_STORES.find((s) => s.name.toLowerCase() === storeName.toLowerCase());
  return store?.logo;
}

/* Extract size/count from product name */
function extractProductMeta(name: string) {
  const sizeMatch = name.match(/(\d+[\s-]?(?:oz|fl\s?oz|lb|lbs|ct|count|pk|pack|rolls|sheets|gal|qt|pt|ml|L|kg|g)\.?)/i);
  const countMatch = name.match(/(\d+)\s*(?:count|ct|pk|pack)\b/i);
  const weightMatch = name.match(/(\d+\.?\d*)\s*(?:oz|lb|lbs|kg|g)\b/i);
  return {
    size: sizeMatch?.[1] || null,
    count: countMatch?.[1] || null,
    weight: weightMatch?.[1] ? weightMatch[0] : null,
  };
}

const PERKS = [
  { icon: Truck, label: "Same-Day Delivery", color: "text-primary" },
  { icon: Clock, label: "Est. ~35 min", color: "text-primary" },
  { icon: ShieldCheck, label: "Quality Guaranteed", color: "text-primary" },
  { icon: RotateCcw, label: "Easy Returns", color: "text-primary" },
];

export function GroceryProductDetail({
  product,
  cartItem,
  onClose,
  onAdd,
  onUpdateQuantity,
  allProducts = [],
  onSelect,
}: GroceryProductDetailProps) {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [liked, setLiked] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const shoppingList = useShoppingList();

  const relatedProducts = useMemo(() => {
    if (!product || allProducts.length === 0) return [];
    return allProducts
      .filter((p) => p.productId !== product.productId && p.store === product.store && p.inStock)
      .slice(0, 8);
  }, [product, allProducts]);

  if (!product) return null;

  const handleAdd = () => {
    for (let i = 0; i < quantity; i++) onAdd(product);
    setJustAdded(true);
    setQuantity(1);
    setTimeout(() => setJustAdded(false), 900);
  };

  const handleAddToList = () => {
    shoppingList.addItem(product.name);
    toast.success("Added to shopping list", { duration: 1500 });
  };

  const handleRelatedSelect = (p: StoreProduct) => {
    setImgError(false);
    setJustAdded(false);
    setQuantity(1);
    setExpandedSection(null);
    onSelect?.(p);
  };

  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  const storeLogo = getStoreLogo(product.store);
  const totalPrice = cartItem ? product.price * cartItem.quantity : product.price * quantity;
  const meta = extractProductMeta(product.name);
  const unitPrice = meta.count ? (product.price / parseInt(meta.count)).toFixed(2) : null;

  return (
    <AnimatePresence>
      {product && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] bg-card rounded-t-[32px] overflow-hidden flex flex-col safe-area-bottom"
            style={{ boxShadow: "0 -8px 40px -8px hsl(var(--foreground) / 0.12)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-border/60" />
            </div>

            {/* Top action bar */}
            <div className="absolute top-3.5 right-4 z-20 flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleAddToList}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/40 flex items-center justify-center shadow-lg"
                aria-label="Add to shopping list"
              >
                <ClipboardList className="h-[18px] w-[18px] text-foreground/50" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setLiked(!liked)}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/40 flex items-center justify-center shadow-lg"
                aria-label="Save"
              >
                <Heart className={`h-[18px] w-[18px] transition-all duration-300 ${liked ? "fill-red-500 text-red-500 scale-110" : "text-foreground/50"}`} />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => openShareToChat({
                  kind: "product",
                  title: product.name,
                  subtitle: product.brand || product.store || undefined,
                  meta: `$${product.price.toFixed(2)}`,
                  deepLink: `/grocery`,
                  image: product.image ?? null,
                })}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/40 flex items-center justify-center shadow-lg"
                aria-label="Share to chat"
              >
                <Share2 className="h-[18px] w-[18px] text-foreground/50" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-xl border border-border/40 flex items-center justify-center shadow-lg"
                aria-label="Close"
              >
                <X className="h-[18px] w-[18px] text-foreground/70" />
              </motion.button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 overscroll-contain">

              {/* ── Hero Image ── */}
              <div className="relative flex items-center justify-center px-8 pt-2 pb-4" style={{ minHeight: 260 }}>
                <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />

                {product.image && !imgError ? (
                  <motion.img
                    src={product.image}
                    alt={product.name}
                    className="relative max-h-[240px] w-auto object-contain drop-shadow-2xl"
                    referrerPolicy="no-referrer"
                    initial={{ scale: 0.8, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, type: "spring", stiffness: 180, damping: 20 }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <Package className="h-24 w-24 text-muted-foreground/8" />
                )}

                {/* Stock pill */}
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`absolute top-3 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border shadow-sm ${
                    product.inStock
                      ? "bg-emerald-500/10 border-emerald-500/20"
                      : "bg-destructive/10 border-destructive/20"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${product.inStock ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
                  <span className={`text-[10px] font-bold tracking-wide uppercase ${product.inStock ? "text-emerald-600" : "text-destructive"}`}>
                    {product.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </motion.div>

                {/* Rating pill */}
                {product.rating != null && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="absolute bottom-3 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-background/90 backdrop-blur-xl border border-border/30 shadow-lg"
                  >
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-bold text-foreground">{product.rating}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">/5</span>
                  </motion.div>
                )}
              </div>

              {/* ── Product Info ── */}
              <div className="px-5 space-y-4 pb-4">

                {/* Store row */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {storeLogo ? (
                      <div className="h-9 w-9 rounded-xl bg-background border border-border/40 shadow-sm flex items-center justify-center p-1">
	                        <img src={storeLogo} alt={product.store} className="h-full w-full object-contain" loading="lazy" decoding="async" />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-xl bg-background border border-border/40 shadow-sm flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <span className="text-[13px] font-bold text-foreground tracking-wide">{product.store}</span>
                      <p className="text-[10px] text-muted-foreground leading-none mt-0.5">In-store pickup available</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/15">
                    <Zap className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-bold text-primary">Same Day</span>
                  </div>
                </motion.div>

                {/* Brand + Size chips */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex items-center gap-2 flex-wrap"
                >
                  {product.brand && (
                    <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-bold">
                      {product.brand}
                    </span>
                  )}
                  {meta.size && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/50 border border-border/20">
                      <Box className="h-2.5 w-2.5 text-muted-foreground/50" />
                      <span className="text-[9px] font-semibold text-muted-foreground">{meta.size}</span>
                    </div>
                  )}
                  {meta.weight && meta.weight !== meta.size && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/50 border border-border/20">
                      <Ruler className="h-2.5 w-2.5 text-muted-foreground/50" />
                      <span className="text-[9px] font-semibold text-muted-foreground">{meta.weight}</span>
                    </div>
                  )}
                </motion.div>

                {/* Product name */}
                <motion.h2
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                  className="text-[22px] font-extrabold text-foreground leading-[1.2] tracking-tight"
                >
                  {product.name}
                </motion.h2>

                {/* Price block - real prices only */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="space-y-1"
                >
                  <div className="flex items-end gap-2.5 flex-wrap">
                    <span className="text-[34px] font-black text-foreground tracking-tight leading-none">
                      ${typeof product.price === "number" ? product.price.toFixed(2) : product.price}
                    </span>
                  </div>
                  {unitPrice && (
                    <p className="text-[11px] text-muted-foreground">
                      <Tag className="h-3 w-3 inline mr-1 -mt-0.5" />
                      ${unitPrice}/ea
                    </p>
                  )}
                </motion.div>

                {/* ── Perks Grid ── */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                  className="grid grid-cols-2 gap-2"
                >
                  {PERKS.map((perk) => (
                    <div
                      key={perk.label}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-muted/30 border border-border/15 backdrop-blur-sm"
                    >
                      <perk.icon className={`h-4 w-4 ${perk.color} shrink-0`} />
                      <span className="text-[11px] font-semibold text-foreground/80 leading-tight">{perk.label}</span>
                    </div>
                  ))}
                </motion.div>

                {/* ── Price Comparison ── */}
                <GroceryPriceCompare
                  productName={product.name}
                  currentStore={product.store}
                  currentPrice={product.price}
                />

                {/* ── Frequently Bought Together ── */}
                <GroceryFrequentlyBoughtTogether
                  currentProduct={product}
                  allProducts={allProducts}
                  cartProductIds={new Set(allProducts.filter(() => false).map((p) => p.productId))}
                  onAddAll={(products) => products.forEach((p) => onAdd(p))}
                  onAdd={onAdd}
                />

                {/* ── Expandable Sections ── */}
                <div className="space-y-0 rounded-2xl border border-border/20 overflow-hidden bg-muted/10">
                  {/* Product Details */}
                  <button type="button"
                    onClick={() => toggleSection("details")}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Info className="h-4 w-4 text-primary/70" />
                      <span className="text-[13px] font-semibold text-foreground">Product Details</span>
                    </div>
                    <motion.div animate={{ rotate: expandedSection === "details" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedSection === "details" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2.5">
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Brand", value: product.brand || "—" },
                              { label: "Size", value: meta.size || "Standard" },
                              { label: "Rating", value: product.rating ? `${product.rating}★` : "N/A" },
                              { label: "Store", value: product.store },
                              { label: "Delivery", value: "Same-Day" },
                              { label: "Stock", value: product.inStock ? "✓ Available" : "✕ Out" },
                            ].map((item) => (
                              <div key={item.label} className="p-2.5 rounded-xl bg-background/60 border border-border/10 text-center">
                                <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">{item.label}</p>
                                <p className="text-[11px] font-bold text-foreground truncate">{item.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/40 border border-border/10">
                            <Barcode className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="text-[9px] text-muted-foreground font-mono tracking-wider">SKU: {product.productId}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="h-px bg-border/15 mx-4" />

                  {/* Highlights */}
                  <button type="button"
                    onClick={() => toggleSection("highlights")}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Leaf className="h-4 w-4 text-emerald-500/70" />
                      <span className="text-[13px] font-semibold text-foreground">Highlights</span>
                    </div>
                    <motion.div animate={{ rotate: expandedSection === "highlights" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedSection === "highlights" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {[
                            "Sourced from trusted brands",
                            "Freshness guaranteed on delivery",
                            product.brand ? `Official ${product.brand} product` : "Verified product listing",
                            "Driver picks the best from the shelf",
                          ].map((h, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="text-[12px] text-foreground/80 leading-snug">{h}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="h-px bg-border/15 mx-4" />

                  {/* Return Policy */}
                  <button type="button"
                    onClick={() => toggleSection("returns")}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <RotateCcw className="h-4 w-4 text-primary/70" />
                      <span className="text-[13px] font-semibold text-foreground">Return & Refund Policy</span>
                    </div>
                    <motion.div animate={{ rotate: expandedSection === "returns" ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {expandedSection === "returns" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-[12px] text-foreground/70 leading-relaxed space-y-2">
                          <p>If your item arrives damaged or is not as described, you can request a full refund within 24 hours of delivery.</p>
                          <p>Contact support via the app and our team will assist you promptly.</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Related Products ── */}
                {relatedProducts.length > 0 && (
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[14px] font-bold text-foreground">You Might Also Like</h3>
                      <span className="text-[10px] text-muted-foreground font-medium">{relatedProducts.length} items</span>
                    </div>
                    <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-5 px-5 scrollbar-hide snap-x snap-mandatory">
                      {relatedProducts.map((rp, i) => (
                        <motion.button
                          key={rp.productId}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * i }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleRelatedSelect(rp)}
                          className="snap-start shrink-0 w-[130px] rounded-2xl bg-background border border-border/25 overflow-hidden text-left hover:border-primary/20 transition-all hover:shadow-md group"
                        >
                          <div className="aspect-square bg-gradient-to-br from-muted/5 to-muted/15 flex items-center justify-center p-3 relative">
                            {rp.image ? (
                              <img
                                src={rp.image}
	                                alt={rp.name}
	                                className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
	                                loading="lazy"
	                                decoding="async"
	                                referrerPolicy="no-referrer"
	                              />
                            ) : (
                              <Package className="h-8 w-8 text-muted-foreground/10" />
                            )}
                            {rp.rating != null && (
                              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background/80 backdrop-blur-sm border border-border/15">
                                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                <span className="text-[8px] font-bold text-foreground">{rp.rating}</span>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5 space-y-1">
                            <p className="text-[10px] text-foreground/70 line-clamp-2 leading-snug font-medium">{rp.name}</p>
                            <p className="text-[13px] font-bold text-foreground">${rp.price.toFixed(2)}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sticky Bottom CTA ── */}
            <div
              className="shrink-0 border-t border-border/20 bg-card/95 backdrop-blur-xl"
              style={{ paddingBottom: "max(var(--zivo-safe-bottom,12px), 12px)" }}
            >
              {!product.inStock ? (
                <div className="px-5 py-4">
                  <div className="text-sm text-muted-foreground text-center py-3.5 rounded-2xl bg-muted/30 font-medium border border-border/20">
                    Currently Unavailable
                  </div>
                </div>
              ) : cartItem ? (
                <div className="px-5 py-3 space-y-2">
                  <div className="flex items-center justify-between bg-primary/8 rounded-2xl p-1.5 border border-primary/15">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => onUpdateQuantity(product.productId, cartItem.quantity - 1)}
                      className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-sm border border-border/20 active:bg-muted transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-5 w-5" />
                    </motion.button>
                    <div className="text-center">
                      <motion.span
                        key={cartItem.quantity}
                        initial={{ scale: 1.5, y: -4 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="text-xl font-black text-primary block"
                      >
                        {cartItem.quantity}
                      </motion.span>
                      <span className="text-[9px] text-muted-foreground font-semibold">in cart</span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => onUpdateQuantity(product.productId, cartItem.quantity + 1)}
                      className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-sm border border-border/20 active:bg-muted transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-5 w-5" />
                    </motion.button>
                  </div>
                  <p className="text-center text-[11px] text-muted-foreground">
                    Subtotal: <span className="font-bold text-foreground">${totalPrice.toFixed(2)}</span>
                  </p>
                </div>
              ) : (
                <div className="px-5 py-3 space-y-2.5">
                  {/* Quantity row */}
                  <div className="flex items-center justify-center gap-5">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-11 w-11 rounded-xl bg-muted/50 border border-border/25 flex items-center justify-center disabled:opacity-25 transition-all active:scale-90"
                    >
                      <Minus className="h-4 w-4 text-foreground" />
                    </motion.button>
                    <motion.span
                      key={quantity}
                      initial={{ scale: 1.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 14 }}
                      className="text-xl font-black text-foreground min-w-[36px] text-center"
                    >
                      {quantity}
                    </motion.span>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setQuantity(quantity + 1)}
                      className="h-11 w-11 rounded-xl bg-muted/50 border border-border/25 flex items-center justify-center transition-all active:scale-90"
                    >
                      <Plus className="h-4 w-4 text-foreground" />
                    </motion.button>
                  </div>

                  {/* CTA button */}
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      className="w-full rounded-2xl h-[52px] text-[14px] font-bold gap-2.5 shadow-xl shadow-primary/25 relative overflow-hidden"
                      onClick={handleAdd}
                    >
                      <AnimatePresence mode="wait">
                        {justAdded ? (
                          <motion.span
                            key="added"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="flex items-center gap-2"
                          >
                            <Check className="h-5 w-5" /> Added to Cart!
                          </motion.span>
                        ) : (
                          <motion.span
                            key="add"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="flex items-center gap-2"
                          >
                            <ShoppingBag className="h-5 w-5" /> Add to Cart — ${totalPrice.toFixed(2)}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
