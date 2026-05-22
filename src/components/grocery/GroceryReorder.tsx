/**
 * GroceryReorder — "Order Again" from real order history (Supabase + localStorage)
 * No hardcoded mock data.
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RotateCcw, Clock, ShoppingCart, Package } from "lucide-react";
import { GROCERY_STORES } from "@/config/groceryStores";
import { supabase } from "@/integrations/supabase/client";

interface RecentOrder {
  slug: string;
  items: string[];
  totalItems: number;
  lastOrder: string;
  price: string;
  storeName: string;
  storeLogo: string;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

export default function GroceryReorder() {
  const navigate = useNavigate();
  const [reorders, setReorders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchRecentOrders() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: orders } = await supabase
          .from("shopping_orders")
          .select("id, store, items, total_amount, placed_at, status")
          .eq("user_id", user.id)
          .eq("order_type", "shopping_delivery")
          .in("status", ["delivered", "completed", "pending", "confirmed", "shopping"])
          .order("placed_at", { ascending: false })
          .limit(5);

        if (cancelled || !orders || orders.length === 0) {
          setLoading(false);
          return;
        }

        // Deduplicate by store — keep latest order per store
        const byStore = new Map<string, RecentOrder>();
        for (const order of orders) {
          const storeSlug = (order.store || "").toLowerCase().replace(/\s+/g, "");
          const storeCfg = GROCERY_STORES.find(
            (s) => s.slug === storeSlug || s.name.toLowerCase() === (order.store || "").toLowerCase()
          );
          if (!storeCfg || byStore.has(storeCfg.slug)) continue;

          const items = Array.isArray(order.items) ? (order.items as any[]) : [];
          const itemNames = items.slice(0, 3).map((i: any) => i.name || "Item");

          byStore.set(storeCfg.slug, {
            slug: storeCfg.slug,
            items: itemNames,
            totalItems: items.length,
            lastOrder: formatTimeAgo(order.placed_at || order.id),
            price: `$${(order.total_amount || 0).toFixed(2)}`,
            storeName: storeCfg.name,
            storeLogo: storeCfg.logo,
          });
        }

        setReorders(Array.from(byStore.values()));
      } catch (err) {
        console.error("[GroceryReorder] Error fetching orders:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRecentOrders();
    return () => { cancelled = true; };
  }, []);

  if (loading || reorders.length === 0) return null;

  return (
    <div className="px-4 pt-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <RotateCcw className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Order Again</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{reorders.length} recent</span>
      </div>
      <div className="space-y-2">
        {reorders.map((r, i) => (
          <motion.button
            key={r.slug}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, type: "spring" as const, stiffness: 300, damping: 24 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/grocery/store/${r.slug}`)}
            className="group w-full flex items-center gap-3 p-3 rounded-[16px] border border-border/30 bg-card/60 backdrop-blur-sm hover:bg-card hover:border-primary/15 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
          >
            <div className="relative h-11 w-11 rounded-xl bg-background border border-border/30 flex items-center justify-center p-1.5 shrink-0 group-hover:shadow-md transition-shadow">
	              <img src={r.storeLogo} alt={r.storeName} className="h-full w-full object-contain" loading="lazy" decoding="async" />
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/15 flex items-center justify-center">
                <RotateCcw className="h-2 w-2 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p className="text-[12px] font-semibold text-foreground truncate">{r.items.join(", ")}</p>
                {r.totalItems > 3 && (
                  <span className="text-[9px] text-muted-foreground shrink-0">+{r.totalItems - 3} more</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{r.storeName}</span>
                <span className="text-[8px] text-muted-foreground/40">·</span>
                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Clock className="h-2 w-2" />
                  {r.lastOrder}
                </span>
                <span className="text-[8px] text-muted-foreground/40">·</span>
                <span className="text-[10px] text-primary font-semibold">{r.price}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 shrink-0">
              <motion.div
                whileHover={{ x: 3 }}
                className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"
              >
                <ShoppingCart className="h-3 w-3 text-primary" />
              </motion.div>
              <span className="text-[8px] text-muted-foreground font-medium">Reorder</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
