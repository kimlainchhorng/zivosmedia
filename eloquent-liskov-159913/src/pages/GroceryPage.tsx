/**
 * GroceryPage - Scalable multi-store product search & shopping cart
 * Driven by GROCERY_STORES config — add a store in one place.
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus, Trash2,
  Loader2, X, Package, Store,
} from "lucide-react";
import { GroceryCheckoutDrawer } from "@/components/grocery/GroceryCheckoutDrawer";
import { GroceryProductCard } from "@/components/grocery/GroceryProductCard";
import { GroceryProductDetail } from "@/components/grocery/GroceryProductDetail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { useStoreSearch, type StoreProduct } from "@/hooks/useStoreSearch";
import { useGroceryCart } from "@/hooks/useGroceryCart";
import { GROCERY_STORES, DEFAULT_STORE, getStoreConfig, getStoresForMarket, type StoreName } from "@/config/groceryStores";
import { useCountry } from "@/hooks/useCountry";
import SEOHead from "@/components/SEOHead";

export default function GroceryPage() {
  const navigate = useNavigate();
  const { country } = useCountry();
  const marketStores = useMemo(() => getStoresForMarket(country), [country]);
  const defaultStore = (marketStores[0]?.name ?? DEFAULT_STORE) as StoreName;
  const [selectedStore, setSelectedStore] = useState<StoreName>(defaultStore);
  const [query, setQuery] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { products, isLoading, error, search, clearResults } = useStoreSearch(selectedStore);
  const cart = useGroceryCart();

  const storeCfg = getStoreConfig(selectedStore);

  const handleSearch = useCallback(
    (val: string) => {
      setQuery(val);
      clearTimeout(debounceRef.current);
      if (val.trim().length < 2) {
        clearResults();
        return;
      }
      debounceRef.current = setTimeout(() => search(val), 500);
    },
    [search, clearResults]
  );

  const handleStoreChange = (store: StoreName) => {
    setSelectedStore(store);
    setQuery("");
    clearResults();
  };

  const handleAdd = (p: StoreProduct) => {
    cart.addItem(
      { productId: p.productId, name: p.name, price: p.price, image: p.image, brand: p.brand },
      p.store
    );
    toast.success(`Added to cart from ${p.store}`);
  };

  const [showCheckout, setShowCheckout] = useState(false);

  const handleCheckout = () => {
    if (cart.itemCount === 0) { toast.error("Your cart is empty"); return; }
    setShowCart(false);
    setShowCheckout(true);
  };

  const handleOrderPlaced = (orderId: string) => {
    cart.clearCart();
    setShowCheckout(false);
    navigate(`/grocery/order-placed?id=${orderId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEOHead
        title="Grocery Delivery – ZIVO | Fresh Groceries Delivered Fast"
        description="Order fresh groceries, household essentials, and more from local stores on ZIVO. Fast delivery, live tracking, and easy checkout."
        canonical="/grocery"
        ogImage="/og-grocery.jpg"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Store",
          "name": "ZIVO Grocery",
          "description": "Online grocery ordering and delivery service",
          "url": "https://zivo.app/grocery",
        }}
      />
      {/* ── Header ── */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <img src={storeCfg.logo} alt={selectedStore} className="h-7 w-7 rounded-lg object-contain" />
            <h1 className="text-lg font-bold truncate">Grocery</h1>
          </div>
          <button type="button" onClick={() => setShowCart(!showCart)} className="relative p-2 rounded-xl hover:bg-muted">
            <ShoppingCart className="h-5 w-5" />
            {cart.itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Store Tabs (horizontal scroll) ── */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {marketStores.map((store) => (
            <button type="button"
              key={store.name}
              onClick={() => handleStoreChange(store.name)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
                selectedStore === store.name
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <img src={store.logo} alt={store.name} className="h-5 w-5 rounded object-contain" />
              {store.name}
            </button>
          ))}
        </div>

        {/* ── Search ── */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={storeCfg.placeholder}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-8 rounded-xl bg-muted/50 border-border/50"
            />
            {query && (
              <button type="button" onClick={() => { setQuery(""); clearResults(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Cart Drawer ── */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="sticky top-[180px] z-20 mx-4 mb-4 bg-card rounded-2xl border border-border shadow-lg overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Shopping Cart ({cart.itemCount})</h3>
                {cart.items.length > 0 && (
                  <button type="button" onClick={cart.clearCart} className="text-xs text-destructive hover:underline">Clear all</button>
                )}
              </div>

              {cart.items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Your cart is empty</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                      {item.image && <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-contain bg-white" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)}</p>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{item.store}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity - 1)} className="p-1 rounded-lg hover:bg-muted"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-semibold w-5 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => cart.updateQuantity(item.productId, item.quantity + 1)} className="p-1 rounded-lg hover:bg-muted"><Plus className="h-3 w-3" /></button>
                        <button type="button" onClick={() => cart.removeItem(item.productId)} className="p-1 rounded-lg hover:bg-destructive/10 ml-1"><Trash2 className="h-3 w-3 text-destructive" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex justify-between text-sm font-semibold mb-3">
                    <span>Total</span>
                    <span>${cart.total.toFixed(2)}</span>
                  </div>
                  <Button onClick={handleCheckout} className="w-full rounded-xl" size="sm">
                    <Package className="h-4 w-4 mr-2" />Place Shopping Order
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">A driver will purchase and deliver your items</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Empty State ── */}
      {!query && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-1">{storeCfg.emptyTitle}</h2>
          <p className="text-sm text-muted-foreground max-w-xs">{storeCfg.emptyDescription}</p>
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 p-4 rounded-xl bg-destructive/10 text-destructive text-sm text-center">{error}</div>
      )}


      {/* ── Product Grid ── */}
      {!isLoading && products.length > 0 && (
        <div className="px-2.5 py-4 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {products.map((product, i) => (
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

      {/* ── No results ── */}
      {!isLoading && query.length >= 2 && products.length === 0 && !error && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No {selectedStore} products found for this query
        </div>
      )}

      {/* ── Checkout Drawer ── */}
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
        allProducts={products}
        onSelect={setSelectedProduct}
      />

      <ZivoMobileNav />
    </div>
  );
}
