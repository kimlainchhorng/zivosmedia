/**
 * MarketplaceCartPage — Your marketplace shopping cart.
 * Backed by `marketplace_cart` joined with `marketplace_listings` (both orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShoppingCart, Sparkles, Minus, Plus, Trash2, Tag, Package, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CartRow {
  id: string;
  user_id: string;
  listing_id: string;
  quantity: number;
  created_at: string;
}

interface ListingRow {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string | null;
  condition: string | null;
  images: string[] | null;
  quantity: number | null;
  status: string | null;
  is_negotiable: boolean | null;
}

function formatCents(cents: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function MarketplaceCartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: cart = [], isLoading } = useQuery({
    queryKey: ["marketplace-cart", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CartRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: CartRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("marketplace_cart")
        .select("id, user_id, listing_id, quantity, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  const listingIds = useMemo(() => Array.from(new Set(cart.map((c) => c.listing_id))), [cart]);

  const { data: listings = [] } = useQuery({
    queryKey: ["marketplace-listings-cart", listingIds.join(",")],
    queryFn: async () => {
      if (listingIds.length === 0) return [] as ListingRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: ListingRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("marketplace_listings")
        .select("id, seller_id, title, description, price_cents, currency, condition, images, quantity, status, is_negotiable")
        .in("id", listingIds);
      return data ?? [];
    },
    enabled: listingIds.length > 0,
    staleTime: 60_000,
  });

  const listingMap = useMemo(() => {
    const m = new Map<string, ListingRow>();
    listings.forEach((l) => m.set(l.id, l));
    return m;
  }, [listings]);

  const enriched = useMemo(() => {
    return cart
      .map((c) => ({ cart: c, listing: listingMap.get(c.listing_id) }))
      .filter((r) => r.listing);
  }, [cart, listingMap]);

  const totals = useMemo(() => {
    return enriched.reduce(
      (acc, r) => {
        const cents = (r.listing?.price_cents ?? 0) * r.cart.quantity;
        return { items: acc.items + r.cart.quantity, subtotal: acc.subtotal + cents };
      },
      { items: 0, subtotal: 0 },
    );
  }, [enriched]);

  const currency = enriched[0]?.listing?.currency ?? "USD";

  const updateQty = async (cartId: string, nextQty: number) => {
    if (nextQty < 1) return;
    qc.setQueryData<CartRow[]>(["marketplace-cart", user?.id], (old) =>
      (old ?? []).map((c) => (c.id === cartId ? { ...c, quantity: nextQty } : c)),
    );
    const sb = supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>;
        };
      };
    };
    const { error } = await sb.from("marketplace_cart").update({ quantity: nextQty }).eq("id", cartId);
    if (error) {
      toast.error("Couldn't update quantity");
      qc.invalidateQueries({ queryKey: ["marketplace-cart", user?.id] });
    }
  };

  const removeItem = async (cartId: string) => {
    qc.setQueryData<CartRow[]>(["marketplace-cart", user?.id], (old) => (old ?? []).filter((c) => c.id !== cartId));
    const sb = supabase as unknown as {
      from: (t: string) => {
        delete: () => {
          eq: (k: string, v: string) => Promise<{ error: unknown }>;
        };
      };
    };
    const { error } = await sb.from("marketplace_cart").delete().eq("id", cartId);
    if (error) {
      toast.error("Couldn't remove");
      qc.invalidateQueries({ queryKey: ["marketplace-cart", user?.id] });
    } else {
      toast.success("Removed");
    }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-32">
      <SEOHead title="Cart · ZIVO" description="Your marketplace cart." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Cart</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Subtotal</p>
          <p className="text-4xl font-extrabold leading-tight mt-1">{formatCents(totals.subtotal, currency)}</p>
          <p className="text-sm text-white/80 mt-1">
            {totals.items} item{totals.items === 1 ? "" : "s"} · {enriched.length} listing{enriched.length === 1 ? "" : "s"}
          </p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && enriched.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ShoppingCart className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">Your cart is empty</p>
            <p className="text-xs text-muted-foreground mb-4">Add listings from the marketplace and they'll appear here ready to checkout.</p>
            <Button
              onClick={() => navigate("/marketplace")}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              Browse marketplace
            </Button>
          </div>
        )}

        {!isLoading && enriched.length > 0 && (
          <div className="space-y-2">
            {enriched.map(({ cart: c, listing: l }, idx) => {
              if (!l) return null;
              const lineTotal = l.price_cents * c.quantity;
              const isInactive = l.status !== "active";
              const maxQty = l.quantity ?? 99;
              const firstImage = Array.isArray(l.images) && l.images.length > 0 ? l.images[0] : null;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn(
                    "flex gap-3 p-3 rounded-2xl bg-card border border-border",
                    isInactive && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/marketplace/${l.id}`)}
                    className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted relative active:scale-95 transition-transform"
                    aria-label={`View ${l.title}`}
                  >
                    {firstImage ? (
                      <img src={firstImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient/10 flex items-center justify-center">
                        <Package className="h-6 w-6 text-ig-gradient" />
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-2">{l.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground">
                      {l.condition && (
                        <span className="inline-flex items-center gap-0.5 capitalize bg-secondary px-1.5 py-0.5 rounded-full font-bold">
                          <Tag className="h-2.5 w-2.5" /> {l.condition}
                        </span>
                      )}
                      {l.is_negotiable && (
                        <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Negotiable
                        </span>
                      )}
                      {isInactive && (
                        <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Unavailable
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-extrabold text-ig-gradient mt-1">{formatCents(lineTotal, l.currency ?? "USD")}</p>
                    {c.quantity > 1 && (
                      <p className="text-[10px] text-muted-foreground">{formatCents(l.price_cents, l.currency ?? "USD")} each</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center bg-secondary rounded-full overflow-hidden">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={c.quantity <= 1}
                          onClick={() => updateQty(c.id, c.quantity - 1)}
                          className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-extrabold text-foreground min-w-[1.5rem] text-center">{c.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={c.quantity >= maxQty}
                          onClick={() => updateQty(c.id, c.quantity + 1)}
                          className="h-7 w-7 inline-flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-40 active:scale-95 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove from cart"
                        onClick={() => removeItem(c.id)}
                        className="h-7 w-7 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && enriched.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 safe-area-bottom bg-background/95 backdrop-blur-md border-t border-border/60">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-xl font-extrabold text-ig-gradient">{formatCents(totals.subtotal, currency)}</p>
            </div>
            <Button
              onClick={() => navigate("/checkout")}
              className="bg-ig-gradient text-white font-bold rounded-full h-12 px-6 hover:opacity-90 border-0 shadow-lg shadow-rose-500/20"
            >
              <CreditCard className="h-4 w-4 mr-2" /> Checkout
            </Button>
          </div>
        </div>
      )}
    </SwipeBackContainer>
  );
}
