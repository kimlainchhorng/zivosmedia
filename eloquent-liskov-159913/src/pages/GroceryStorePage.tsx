/**
 * GroceryStorePage - 2026 Spatial UI product search (v4)
 * Added sort toggle, horizontal featured row, refined layout
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus, Trash2,
  Loader2, X, Package, Store, Sparkles, Clock, Star, ChevronUp, Filter,
  ArrowUpDown, Grid3X3, LayoutList, TrendingDown, SlidersHorizontal,
} from "lucide-react";
import { GroceryCheckoutDrawer } from "@/components/grocery/GroceryCheckoutDrawer";
import { GroceryProductCard } from "@/components/grocery/GroceryProductCard";
import { GroceryProductDetail } from "@/components/grocery/GroceryProductDetail";
import { GroceryOrderAgain, saveToOrderHistory } from "@/components/grocery/GroceryOrderAgain";
import { GroceryCategoryBrowser } from "@/components/grocery/GroceryCategoryBrowser";
import { GroceryDealsSection } from "@/components/grocery/GroceryDealsSection";
import { GroceryStoreSearch } from "@/components/grocery/GroceryStoreSearch";
import { GroceryFilters, GroceryFilterButton, applyFilters, hasActiveFilters, EMPTY_FILTERS, type ActiveFilters } from "@/components/grocery/GroceryFilters";
import { GroceryPromoBanner } from "@/components/grocery/GroceryPromoBanner";
import { GroceryStoreHero } from "@/components/grocery/GroceryStoreHero";
import { GroceryShoppingList } from "@/components/grocery/GroceryShoppingList";
import { GroceryPolicyFooter } from "@/components/grocery/GroceryPolicyFooter";
import { GroceryLoyaltyBanner, GroceryMemberDeals } from "@/components/grocery/GroceryLoyaltyBanner";
import { GroceryOrderTracker } from "@/components/grocery/GroceryOrderTracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { useStoreSearch, type StoreProduct } from "@/hooks/useStoreSearch";
import { useGroceryCart } from "@/hooks/useGroceryCart";
import { getStoreBySlug } from "@/config/groceryStores";
import { getStoreStatus, getLiveEta } from "@/utils/storeStatus";
import { addRecentStore } from "@/components/grocery/GroceryRecentStores";
import GroceryDeliveryBar from "@/components/grocery/GroceryDeliveryBar";

const QUICK_FILTERS = [
  { label: "🔥 Popular", query: "snacks drinks chips cookies soda" },
  { label: "🥩 Meat", query: "chicken beef pork steak ground meat" },
  { label: "🥦 Produce", query: "apples bananas lettuce tomatoes oranges" },
  { label: "🥛 Dairy", query: "milk eggs cheese yogurt butter" },
  { label: "🍞 Bakery", query: "bread rolls bagels muffins donuts" },
  { label: "🥤 Drinks", query: "coca cola pepsi sprite water juice" },
  { label: "🧃 Juice", query: "orange juice apple juice cranberry lemonade" },
  { label: "☕ Coffee", query: "folgers coffee keurig pods creamer" },
  { label: "🍿 Snacks", query: "doritos lays oreo goldfish crackers" },
  { label: "🧊 Frozen", query: "frozen pizza ice cream chicken nuggets" },
  { label: "🍝 Pasta", query: "spaghetti pasta sauce penne noodles" },
  { label: "🥫 Canned", query: "campbell soup canned beans corn tuna" },
  { label: "🧹 Household", query: "paper towels toilet paper detergent soap" },
  { label: "🐶 Pets", query: "dog food cat food pet treats litter" },
  { label: "🌿 Garden", query: "garden seeds soil plants flowers pots" },
  { label: "🪑 Patio", query: "patio furniture outdoor chair cushion umbrella" },
  { label: "🔥 Grilling", query: "grill charcoal smoker bbq tongs spatula" },
  { label: "🏋️ Sports", query: "basketball football dumbbells yoga mat" },
  { label: "🧴 Beauty", query: "shampoo makeup lotion sunscreen skincare" },
  { label: "💊 Health", query: "vitamins tylenol advil cold medicine allergy" },
  { label: "👶 Baby", query: "diapers formula baby food wipes bottles" },
  { label: "🎮 Electronics", query: "charger headphones speaker phone case" },
  { label: "👕 Clothing", query: "t-shirt socks underwear jeans shoes" },
  { label: "🧸 Toys", query: "lego barbie hot wheels board games puzzles" },
  { label: "🍳 Kitchen", query: "frying pan knife cutting board blender" },
  { label: "🛏️ Bedding", query: "sheets pillow blanket comforter towels" },
  { label: "🔧 Tools", query: "hammer screwdriver drill tape measure wrench" },
  { label: "🧽 Cleaning", query: "lysol wipes bleach mop sponge broom" },
  { label: "🍬 Candy", query: "chocolate gummy bears skittles candy bar" },
  { label: "🧊 Ice Cream", query: "ice cream popsicle frozen yogurt gelato" },
  { label: "🌮 Mexican", query: "tortilla salsa taco shells queso" },
  { label: "🍜 Asian", query: "ramen soy sauce rice noodles teriyaki" },
  { label: "🧀 Deli", query: "deli meat ham turkey salami cheese sliced" },
  { label: "🎂 Baking", query: "flour sugar baking soda vanilla frosting" },
  { label: "🍷 Beverages", query: "wine beer seltzer sparkling water mixer" },
  { label: "🥜 Organic", query: "organic granola almond milk quinoa kale" },
  { label: "🧃 Kids", query: "juice box lunchables fruit snacks goldfish" },
];

type SortMode = "default" | "price-low" | "price-high" | "rating";

/* ─── Swipeable cart item ─── */
function SwipeableCartItem({
  item,
  index,
  onUpdateQuantity,
  onRemove,
}: {
  item: { productId: string; name: string; price: number; image: string; quantity: number };
  index: number;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const bg = useTransform(x, [-100, 0], ["hsl(0 84% 60% / 0.15)", "transparent"]);
  const trashOpacity = useTransform(x, [-80, -30], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -80) onRemove(item.productId);
  };

  return (
    <motion.div className="relative overflow-hidden rounded-[16px]" style={{ backgroundColor: bg }}>
      <motion.div
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-destructive"
        style={{ opacity: trashOpacity }}
      >
        <Trash2 className="h-4 w-4" />
        <span className="text-[10px] font-bold">Remove</span>
      </motion.div>

      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="flex items-center gap-2.5 p-2 bg-muted/20 border border-border/15 rounded-[16px] relative"
      >
        {item.image && (
          <div className="h-10 w-10 rounded-xl bg-background border border-border/20 flex items-center justify-center p-1 shrink-0">
            <img src={item.image} alt="" className="h-full w-full object-contain" referrerPolicy="no-referrer" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate">{item.name}</p>
          <p className="text-[10px] text-muted-foreground">
            ${item.price.toFixed(2)} × {item.quantity} = <span className="font-bold text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)} className="p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all"><Minus className="h-3 w-3" /></motion.button>
          <motion.span key={item.quantity} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="text-[11px] font-bold w-4 text-center">{item.quantity}</motion.span>
          <motion.button whileTap={{ scale: 0.8 }} onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)} className="p-1.5 rounded-lg hover:bg-muted active:scale-95 transition-all"><Plus className="h-3 w-3" /></motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Horizontal featured product ─── */
function FeaturedProductRow({ products, onAdd, cart }: {
  products: StoreProduct[];
  onAdd: (p: StoreProduct) => void;
  cart: ReturnType<typeof useGroceryCart>;
}) {
  if (products.length === 0) return null;

  // Pick top 5 by rating
  const featured = [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);

  return (
    <div className="pt-3 pb-2">
      <div className="flex items-center gap-1.5 mb-3 px-4">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-bold text-foreground/80 uppercase tracking-wider">Top Picks</span>
        <span className="text-[10px] text-muted-foreground ml-auto">Scroll →</span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto pb-2 px-4 snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {featured.map((p, i) => {
          const inCart = cart.items.find((c) => c.productId === p.productId);
          return (
            <motion.div
              key={p.productId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, type: "spring", stiffness: 300, damping: 24 }}
              className="snap-start shrink-0 w-[150px] rounded-2xl border border-border/30 bg-card overflow-hidden group hover:border-primary/20 hover:shadow-lg transition-all duration-200"
            >
              <div className="relative h-[120px] bg-gradient-to-br from-primary/[0.03] to-muted/20 flex items-center justify-center p-3.5 cursor-pointer" onClick={() => onAdd(p)}>
                {p.image ? (
                  <img src={p.image} alt={p.name} className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground/10" />
                )}
                {p.rating != null && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/20 shadow-sm">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[9px] font-bold text-foreground">{p.rating}</span>
                  </div>
                )}
                {/* Stock indicator */}
                <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-emerald-500 border border-background shadow-sm" />
              </div>
              <div className="p-2.5 space-y-1.5">
                <p className="text-[11px] font-semibold line-clamp-2 text-foreground/90 leading-snug min-h-[28px]">{p.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-extrabold text-foreground tracking-tight">${p.price.toFixed(2)}</span>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => onAdd(p)}
                    className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      inCart
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                        : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15"
                    }`}
                  >
                    {inCart ? <span className="text-[10px] font-bold">{inCart.quantity}</span> : <Plus className="h-3.5 w-3.5" />}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function GroceryStorePage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const storeCfg = getStoreBySlug(slug || "walmart");

  const [query, setQuery] = useState("");
  const [browseQuery, setBrowseQuery] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const storeName = storeCfg?.name ?? "Walmart";
  const { products, isLoading, isLoadingMore, hasMore, error, search, loadMore, clearResults } = useStoreSearch(storeName);
  const cart = useGroceryCart();
  const hasLoadedDefaults = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Live ETA
  const [liveEta, setLiveEta] = useState(storeCfg?.deliveryMin ?? 35);
  useEffect(() => {
    if (!storeCfg) return;
    const compute = () => setLiveEta(getLiveEta(storeCfg.deliveryMin));
    compute();
    const interval = setInterval(compute, 30_000);
    return () => clearInterval(interval);
  }, [storeCfg]);

  useEffect(() => { if (slug) addRecentStore(slug); }, [slug]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isLoading, loadMore]);

  // Auto-load multiple pages on mount for a fuller grid
  const autoLoadCount = useRef(0);
  const autoLoadTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  
  useEffect(() => {
    if (storeCfg && !hasLoadedDefaults.current) {
      hasLoadedDefaults.current = true;
      search(storeCfg.defaultQuery);
    }
  }, [storeCfg, search]);

   // After each page finishes loading, auto-queue the next one (up to 10 rounds for more products)
  useEffect(() => {
    if (autoLoadTimer.current) clearTimeout(autoLoadTimer.current);
    if (!isLoading && !isLoadingMore && products.length > 0 && hasMore && autoLoadCount.current < 40) {
      autoLoadTimer.current = setTimeout(() => {
        autoLoadCount.current += 1;
        loadMore();
      }, 400);
    }
    return () => { if (autoLoadTimer.current) clearTimeout(autoLoadTimer.current); };
  }, [isLoading, isLoadingMore, products.length, hasMore, loadMore]);

  // Reset auto-load counter when user manually searches
  const handleSearch = (val: string) => {
    setQuery(val);
    setActiveFilter(null);
    setBrowseQuery(null);
    autoLoadCount.current = 0;
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      debounceRef.current = setTimeout(() => search(storeCfg!.defaultQuery), 100);
      return;
    }
    debounceRef.current = setTimeout(() => search(val), 500);
  };

  const handleQuickFilter = (filter: typeof QUICK_FILTERS[0]) => {
    autoLoadCount.current = 0;
    setBrowseQuery(null);
    if (activeFilter === filter.label) {
      setActiveFilter(null);
      setQuery("");
      search(storeCfg!.defaultQuery);
    } else {
      setActiveFilter(filter.label);
      setQuery("");
      search(filter.query);
    }
  };

  // Filter + sort products
  const filteredProducts = useMemo(() => applyFilters(products, filters), [products, filters]);
  const sortedProducts = useMemo(() => {
    if (sortMode === "default") return filteredProducts;
    const sorted = [...filteredProducts];
    if (sortMode === "price-low") sorted.sort((a, b) => a.price - b.price);
    if (sortMode === "price-high") sorted.sort((a, b) => b.price - a.price);
    if (sortMode === "rating") sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return sorted;
  }, [filteredProducts, sortMode]);

  const filterCount = (filters.priceRange ? 1 : 0) + (filters.minRating ? 1 : 0) + filters.dietary.length + filters.brands.length;

  if (!storeCfg) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Store className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold mb-2">Store not found</h2>
        <Button variant="outline" onClick={() => navigate("/grocery")}>Back to stores</Button>
        <ZivoMobileNav />
      </div>
    );
  }

  const status = getStoreStatus(storeCfg.hours);


  const handleAdd = (p: StoreProduct) => {
    cart.addItem(
      { productId: p.productId, name: p.name, price: p.price, image: p.image, brand: p.brand },
      storeName
    );
    toast.success("Added to cart", { duration: 1500 });
  };

  const handleCheckout = () => {
    if (cart.itemCount === 0) { toast.error("Your cart is empty"); return; }
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleOrderPlaced = (orderId: string) => {
    // Save items to order history for "Order Again"
    saveToOrderHistory(cart.items.map((i) => ({
      productId: i.productId, name: i.name, price: i.price, image: i.image, brand: i.brand, store: i.store,
    })));
    cart.clearCart();
    setShowCheckout(false);
    navigate(`/grocery/order-placed?id=${orderId}`);
  };

  const cycleSortMode = () => {
    const modes: SortMode[] = ["default", "price-low", "price-high", "rating"];
    const idx = modes.indexOf(sortMode);
    setSortMode(modes[(idx + 1) % modes.length]);
  };

  const sortLabel: Record<SortMode, string> = {
    default: "Default",
    "price-low": "Price ↑",
    "price-high": "Price ↓",
    rating: "Rating",
  };

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <SEOHead title={`${storeName} Grocery – ZIVO`} description={`Shop ${storeName} grocery for same-day delivery on ZIVO.`} />
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/6 blur-[60px]" />
        <div className="absolute bottom-1/3 -left-20 h-48 w-48 rounded-full bg-accent/8 blur-[60px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/70 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/grocery")}
            className="p-2 rounded-2xl hover:bg-muted/60 transition-colors duration-200"
            aria-label="Back to stores"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative h-10 w-10 rounded-2xl bg-background border border-border/30 flex items-center justify-center p-1.5 shadow-sm">
              <img src={storeCfg.logo} alt={storeName} className="h-full w-full object-contain" />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                {status.isOpen && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ring-2 ring-background ${status.isOpen ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              </span>
            </div>
            <div>
              <h1 className="text-base font-bold truncate leading-tight">{storeName}</h1>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground font-medium">Delivered by ZIVO</p>
                <span className="text-[9px] text-muted-foreground/60">·</span>
                <motion.span
                  key={liveEta}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-0.5 text-[10px] text-primary font-semibold"
                >
                  <Clock className="h-2.5 w-2.5" />
                  {liveEta}m
                </motion.span>
                <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {storeCfg.rating}
                </span>
              </div>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setShowCart((prev) => !prev);
            }}
            className="relative p-3 -mr-1 rounded-2xl bg-muted/30 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center z-40 touch-manipulation cursor-pointer"
            aria-label="Shopping cart"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <ShoppingCart className="h-5 w-5" />
            {cart.itemCount > 0 && (
              <motion.span
                key={cart.itemCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold min-w-[22px] h-[22px] px-1 shadow-lg shadow-primary/40 ring-2 ring-background pointer-events-none"
              >
                {cart.itemCount}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Delivery address */}
        <GroceryDeliveryBar />

        {/* Smart Search */}
        <GroceryStoreSearch
          placeholder={storeCfg.placeholder}
          storeName={storeName}
          query={query}
          onSearch={handleSearch}
          onSubmit={(val) => { autoLoadCount.current = 0; setBrowseQuery(null); setQuery(val); search(val); }}
          onClear={() => { setQuery(""); setBrowseQuery(null); autoLoadCount.current = 0; search(storeCfg.defaultQuery); setActiveFilter(null); }}
        />

        {/* Quick filter chips */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {QUICK_FILTERS.map((f) => (
            <motion.button
              key={f.label}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleQuickFilter(f)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all duration-200 ${
                activeFilter === f.label
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60 border border-border/20"
              }`}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Category Browser - always visible on landing (hidden when browsing a category) */}
      {!isLoading && !query && !activeFilter && !browseQuery && (
        <GroceryCategoryBrowser
          store={storeName}
          onAdd={handleAdd}
          cartProductIds={new Set(cart.items.map((c) => c.productId))}
          onBrowse={(q) => {
            autoLoadCount.current = 0;
            setBrowseQuery(q);
            setQuery("");
            search(q);
          }}
          onSelect={setSelectedProduct}
        />
      )}

      {/* Back to categories button when browsing */}
      {browseQuery && !query && (
        <div className="px-4 pt-3 pb-1">
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setBrowseQuery(null);
              autoLoadCount.current = 0;
              search(storeCfg!.defaultQuery);
            }}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline"
          >
            ← Back to categories
          </motion.button>
        </div>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
            className="fixed left-4 right-4 z-50 bg-card/95 backdrop-blur-xl rounded-[24px] border border-border/40 shadow-2xl overflow-hidden max-h-[70vh] overflow-y-auto"
            style={{ top: "calc(var(--zivo-safe-top,0px) + 4rem)" }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm">Cart</h3>
                  <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">{cart.itemCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  {cart.items.length > 0 && (
                    <button type="button" onClick={cart.clearCart} className="text-[11px] text-destructive hover:underline font-medium">Clear</button>
                  )}
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowCart(false)} className="p-1 rounded-lg hover:bg-muted/60 transition-colors">
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                </div>
              </div>

              {cart.items.length === 0 ? (
                <div className="text-center py-6">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-hide">
                    {cart.items.map((item, i) => (
                      <SwipeableCartItem key={item.productId} item={item} index={i} onUpdateQuantity={cart.updateQuantity} onRemove={cart.removeItem} />
                    ))}
                  </div>
                  {cart.items.length > 1 && (
                    <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">← Swipe left to remove</p>
                  )}
                </>
              )}

              {cart.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/20">
                  <div className="flex justify-between text-sm font-bold mb-3">
                    <span>Total</span><span className="text-primary">${cart.total.toFixed(2)}</span>
                  </div>
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button onClick={handleCheckout} className="w-full rounded-2xl h-11 font-bold">
                      <Package className="h-4 w-4 mr-2" />Place Order
                    </Button>
                  </motion.div>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">A ZIVO driver will shop & deliver</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
          {/* Horizontal skeleton row */}
          <div className="flex gap-2.5 overflow-hidden mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`h-${i}`} className="shrink-0 w-[140px] rounded-[18px] border border-border/20 overflow-hidden">
                <Skeleton className="h-[100px]" />
                <div className="p-2.5 space-y-1.5">
                  <Skeleton className="h-2.5 w-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-[22px] border border-border/20 bg-card/60 overflow-hidden"
              >
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-2 w-12 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                  <Skeleton className="h-5 w-16 rounded" />
                  <Skeleton className="h-9 w-full rounded-[14px] mt-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center"
        >
          {error}
        </motion.div>
      )}

      {/* Empty */}
      {!isLoading && !error && products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Search className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {query.length >= 2 ? `No products found for "${query}"` : "No products available"}
          </p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Try a different search term</p>
        </motion.div>
      )}

      {/* Active order tracker */}
      {!isLoading && (
        <GroceryOrderTracker store={storeName} />
      )}

      {/* Loyalty banner */}
      {!isLoading && (
        <GroceryLoyaltyBanner cartTotal={cart.total > 0 ? cart.total : undefined} />
      )}

      {/* Order Again */}
      {!isLoading && !query && (
        <GroceryOrderAgain
          store={storeName}
          onAdd={handleAdd}
          cartProductIds={new Set(cart.items.map((c) => c.productId))}
        />
      )}

      {/* Member Deals */}
      {!isLoading && products.length > 8 && (
        <GroceryMemberDeals
          products={products}
          onAdd={handleAdd}
          cartProductIds={new Set(cart.items.map((c) => c.productId))}
        />
      )}

      {/* Today's Deals */}
      {!isLoading && products.length > 5 && (
        <GroceryDealsSection
          products={products}
          onAdd={handleAdd}
          cartProductIds={new Set(cart.items.map((c) => c.productId))}
        />
      )}

      {/* Featured horizontal row */}
      {!isLoading && products.length > 3 && (
        <FeaturedProductRow products={products} onAdd={handleAdd} cart={cart} />
      )}

      {/* Result count + sort */}
      {!isLoading && products.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-3 mb-2 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground font-medium">
              {products.length} product{products.length !== 1 ? "s" : ""}{query ? ` for "${query}"` : ""}
            </span>
            {activeFilter && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-[9px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded-full"
              >
                <Filter className="h-2 w-2" />
                {activeFilter}
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={cycleSortMode}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/30 border border-border/20 hover:bg-muted/50 transition-colors"
            >
              <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">{sortLabel[sortMode]}</span>
            </motion.button>
            <GroceryFilterButton activeCount={filterCount} onClick={() => setShowFilters(true)} />
          </div>
        </motion.div>
      )}

      {/* Product Grid */}
      {!isLoading && sortedProducts.length > 0 && (
        <div className="px-2.5 pb-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {sortedProducts.map((product, i) => (
            <GroceryProductCard
              key={product.productId || i}
              product={product}
              index={i}
              cartItem={cart.items.find((c) => c.productId === product.productId)}
              onAdd={handleAdd}
              onUpdateQuantity={cart.updateQuantity}
              onSelect={setSelectedProduct}
            />
          ))}
        </div>
      )}

      {/* Store info & extras - below products */}
      <GroceryStoreHero store={storeCfg} liveEta={liveEta} isOpen={status.isOpen} />
      <GroceryPromoBanner />
      <GroceryShoppingList
        onSearchItem={(text) => {
          autoLoadCount.current = 0;
          setQuery(text);
          search(text);
        }}
      />
      <GroceryPolicyFooter />

      {/* Load more sentinel */}
      <div ref={sentinelRef} className="h-1" />
      {isLoadingMore && (
        <div className="flex justify-center py-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2 rounded-full bg-muted/30 border border-border/20"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span>Loading more…</span>
          </motion.div>
        </div>
      )}

      {/* Floating cart bar */}
      <AnimatePresence>
        {cart.itemCount > 0 && !showCheckout && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 25 }}
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+6rem)] left-4 right-4 z-30"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCart(true)}
              className="w-full flex items-center justify-between gap-3 p-3.5 pl-4 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 border border-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-primary-foreground/20 backdrop-blur-sm">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-[12px] font-bold">{cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}</p>
                  <motion.p
                    key={liveEta}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] opacity-80 flex items-center gap-1"
                  >
                    <Clock className="h-2.5 w-2.5" />
                    Est. delivery {liveEta}m
                  </motion.p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[15px] font-extrabold">${cart.total.toFixed(2)}</p>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckout && (
          <GroceryCheckoutDrawer
            items={cart.items}
            total={cart.total}
            onClose={() => setShowCheckout(false)}
            onOrderPlaced={handleOrderPlaced}
            onRemoveItem={cart.removeItem}
            onUpdateQuantity={cart.updateQuantity}
          />
        )}
      </AnimatePresence>

      <GroceryProductDetail
        product={selectedProduct}
        cartItem={selectedProduct ? cart.items.find((c) => c.productId === selectedProduct.productId) : undefined}
        onClose={() => setSelectedProduct(null)}
        onAdd={handleAdd}
        onUpdateQuantity={cart.updateQuantity}
        allProducts={sortedProducts}
        onSelect={setSelectedProduct}
      />

      <GroceryFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
        products={products}
      />

      <ZivoMobileNav />
    </div>
  );
}
