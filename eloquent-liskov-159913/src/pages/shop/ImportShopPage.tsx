/**
 * ImportShopPage - Lazada/Taobao-style cross-border product browser.
 * Customers buy here; orders are sourced from China/Thailand and delivered
 * via the local Phnom Penh warehouse + ZIVO Driver dispatch.
 */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Search, Truck, Package, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useImportProducts, useImportCart } from "@/hooks/useImportShop";

const CATEGORIES = ["All", "Fashion", "Electronics", "Home", "Beauty", "Toys", "Grocery", "Sports"];

export default function ImportShopPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { data: products = [], isLoading } = useImportProducts(category);
  const { itemCount } = useImportCart();

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter((p) => p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
  }, [products, search]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button variant="ghost" size="icon" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-bold flex-1">ZIVO Shop</h1>
          <Button variant="ghost" size="icon" aria-label="View cart" className="relative" onClick={() => navigate("/shop/cart")}>
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products from China, Thailand..."
              className="pl-9 h-10 rounded-xl bg-muted/40 border-0"
            />
          </div>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-1.5 px-3 pb-2.5">
            {CATEGORIES.map((c) => (
              <button type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`min-h-[40px] rounded-full px-4 py-2 text-[12px] font-semibold whitespace-nowrap transition touch-manipulation ${
                  category === c ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </header>

      {/* Hero strip */}
      <div className="px-3 pt-3">
        <div className="rounded-2xl p-3.5 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold leading-tight">Buy from anywhere · Delivered to your door</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">7–14 days via our Phnom Penh warehouse · Pay by Card, ABA, or Cash on Delivery</p>
          </div>
        </div>
      </div>

      {/* Order tracking shortcut */}
      <div className="px-3 pt-2">
        <Link
          to="/shop/orders"
          className="flex min-h-[44px] items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5 text-[13px] touch-manipulation"
        >
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="font-semibold">Track my orders</span>
          </span>
          <span className="text-muted-foreground">→</span>
        </Link>
      </div>

      {/* Products grid */}
      <section className="px-3 pt-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground/80">No products yet</p>
            <p className="text-[12px] text-muted-foreground mt-1 max-w-[260px]">
              Our team is curating items from Taobao, Lazada and 1688. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filtered.map((p) => (
              <Link
                key={p.id}
                to={`/shop/product/${p.id}`}
                className="bg-card rounded-2xl overflow-hidden border border-border/30 hover:border-border transition group"
              >
                <div className="aspect-square bg-muted/40 overflow-hidden">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-[12px] leading-tight line-clamp-2 font-medium">{p.title}</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-bold text-primary">${(p.final_price_cents / 100).toFixed(2)}</span>
                    {p.featured && <Badge variant="secondary" className="h-4 px-1 text-[9px]">HOT</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {p.est_delivery_days_min}–{p.est_delivery_days_max} days
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
