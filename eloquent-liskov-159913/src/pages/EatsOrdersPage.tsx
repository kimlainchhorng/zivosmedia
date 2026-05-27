/**
 * EatsOrdersPage — Customer order history with reorder + receipt view
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, CheckCircle, Package, Truck, Star,
  UtensilsCrossed, Receipt, RotateCcw, ChevronRight, Loader2,
  MapPin, CreditCard, X, ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

interface FoodOrder {
  id: string;
  status: string;
  tracking_code: string | null;
  delivery_address: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number | null;
  service_fee: number | null;
  tip_amount: number | null;
  payment_type: string | null;
  created_at: string | null;
  delivered_at: string | null;
  restaurant_id: string;
  items: any;
  rating: number | null;
  special_instructions: string | null;
  discount_amount: number | null;
  promo_code: string | null;
  express_fee_cents: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle },
  preparing: { label: "Preparing", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: UtensilsCrossed },
  ready: { label: "Ready", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Package },
  picked_up: { label: "Picked Up", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: Truck },
  out_for_delivery: { label: "On the Way", color: "bg-primary/10 text-primary border-primary/20", icon: Truck },
  delivered: { label: "Delivered", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20", icon: X },
};

function useEatsOrderHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["eats-order-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("food_orders")
        .select("id, status, tracking_code, delivery_address, total_amount, subtotal, delivery_fee, service_fee, tip_amount, payment_type, created_at, delivered_at, restaurant_id, items, rating, special_instructions, discount_amount, promo_code, express_fee_cents")
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as FoodOrder[];
    },
    enabled: !!user,
  });
}

function useRestaurantNames(ids: string[]) {
  return useQuery({
    queryKey: ["restaurant-names", ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, logo_url")
        .in("id", ids);
      const map: Record<string, { name: string; logo_url: string | null }> = {};
      (data ?? []).forEach(r => { map[r.id] = { name: r.name, logo_url: r.logo_url }; });
      return map;
    },
    enabled: ids.length > 0,
  });
}

export default function EatsOrdersPage() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useEatsOrderHistory();
  const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "delivered" | "cancelled">("all");
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  const handleRate = async (orderId: string, stars: number) => {
    setSavingRating(true);
    const { error } = await supabase.from("food_orders").update({ rating: stars } as any).eq("id", orderId);
    setSavingRating(false);
    if (!error) {
      setSelectedOrder(prev => prev ? { ...prev, rating: stars } : prev);
      queryClient.setQueryData(["eats-order-history", queryClient], (old: FoodOrder[] | undefined) =>
        old ? old.map(o => o.id === orderId ? { ...o, rating: stars } : o) : old
      );
      toast.success(`Rated ${stars} star${stars !== 1 ? "s" : ""} — thanks!`);
    } else {
      toast.error("Couldn't save rating.");
    }
  };

  const queryClient = useQueryClient();
  const restaurantIds = [...new Set(orders.map(o => o.restaurant_id))];
  const { data: restaurants = {} } = useRestaurantNames(restaurantIds);

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["eats-order-history"] });
  }, [queryClient]);

  const activeStatuses = ["pending", "confirmed", "preparing", "ready", "picked_up", "out_for_delivery"];
  const filtered = orders.filter(o => {
    if (filter === "active") return activeStatuses.includes(o.status);
    if (filter === "delivered") return o.status === "delivered";
    if (filter === "cancelled") return o.status === "cancelled";
    return true;
  });

  const activeCount = orders.filter(o => activeStatuses.includes(o.status)).length;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen bg-background">
      <SEOHead title="Order History – ZIVO Eats" description="View your food delivery order history, reorder favorite meals, and track past deliveries." />
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-20 bg-background/95 backdrop-blur-2xl border-b border-border/30">
        <div className="px-4 py-3 flex items-center gap-3 safe-area-top">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-ig-gradient">Order History</h1>
            <p className="text-[10px] text-muted-foreground">{orders.length} orders</p>
          </div>
          {activeCount > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold animate-pulse">
              {activeCount} active
            </Badge>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 pb-3">
          {([
            { id: "all" as const, label: "All" },
            { id: "active" as const, label: "Active" },
            { id: "delivered" as const, label: "Delivered" },
            { id: "cancelled" as const, label: "Cancelled" },
          ]).map(f => (
            <button type="button" key={f.id} onClick={() => setFilter(f.id)}
              className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all touch-manipulation active:scale-95",
                filter === f.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground border border-border/40")}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No orders yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your order history will appear here</p>
            <Button variant="outline" onClick={() => navigate("/eats")} className="mt-4 rounded-xl">
              Browse Restaurants
            </Button>
          </div>
        )}

        {filtered.map((order, i) => {
          const restaurant = restaurants[order.restaurant_id];
          const items = Array.isArray(order.items) ? order.items : [];
          const config = statusConfig[order.status] || statusConfig.pending;
          const StatusIcon = config.icon;

          return (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}>
              <button type="button" onClick={() => setSelectedOrder(order)}
                className="w-full text-left rounded-2xl bg-card border border-border/40 p-4 hover:border-primary/20 transition-all touch-manipulation active:scale-[0.99] space-y-3">
                <div className="flex items-center gap-3">
                  {restaurant?.logo_url ? (
	                    <img src={restaurant.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {restaurant?.name || "Restaurant"}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(order.created_at)} · {formatTime(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-foreground">${order.total_amount.toFixed(2)}</p>
                    <Badge variant="outline" className={cn("text-[9px] font-bold mt-1", config.color)}>
                      <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                      {config.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{items.length} item{items.length !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span className="truncate flex-1">
                    {items.slice(0, 3).map((it: any) => it.name).join(", ")}
                    {items.length > 3 && ` +${items.length - 3} more`}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
                {order.rating && (
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={cn("w-3 h-3", s <= order.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                    ))}
                  </div>
                )}
                {activeStatuses.includes(order.status) && (
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/eats/track/${order.id}`); }}
                    className="w-full rounded-xl h-9 text-xs font-bold gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 border-0">
                    <Truck className="w-3.5 h-3.5" /> Track Order
                  </Button>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setSelectedOrder(null)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card border border-border/40 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                {/* Receipt Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-bold text-foreground">Order Receipt</h2>
                  </div>
                  <button type="button" onClick={() => setSelectedOrder(null)}
                    className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center touch-manipulation active:scale-90">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center pb-3 border-b border-border/30">
                  <p className="text-xs font-mono text-muted-foreground">#{selectedOrder.tracking_code || selectedOrder.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(selectedOrder.created_at)} at {formatTime(selectedOrder.created_at)}
                  </p>
                  {(() => {
                    const c = statusConfig[selectedOrder.status] || statusConfig.pending;
                    return (
                      <Badge variant="outline" className={cn("mt-2 text-[10px] font-bold", c.color)}>
                        {c.label}
                      </Badge>
                    );
                  })()}
                </div>

                {/* Restaurant */}
                <div className="flex items-center gap-3">
                  <UtensilsCrossed className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-foreground">
                    {restaurants[selectedOrder.restaurant_id]?.name || "Restaurant"}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Fee Breakdown */}
                <div className="space-y-2 pt-3 border-t border-border/30 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold">${selectedOrder.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedOrder.delivery_fee != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="font-bold">
                        {selectedOrder.delivery_fee === 0 ? <span className="text-primary">Free</span> : `$${selectedOrder.delivery_fee.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  {selectedOrder.service_fee != null && selectedOrder.service_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service fee</span>
                      <span className="font-bold">${selectedOrder.service_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.tip_amount != null && selectedOrder.tip_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tip</span>
                      <span className="font-bold">${selectedOrder.tip_amount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.express_fee_cents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Priority fee</span>
                      <span className="font-bold">${(selectedOrder.express_fee_cents / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.discount_amount != null && selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-primary">
                      <span className="font-bold">Discount</span>
                      <span className="font-bold">-${selectedOrder.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-border/30">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-bold text-xl text-primary">${selectedOrder.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Delivery & Payment */}
                <div className="space-y-2 pt-3 border-t border-border/30">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground">{selectedOrder.delivery_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground capitalize">{selectedOrder.payment_type || "Card"}</span>
                  </div>
                </div>

                {/* Rate this order */}
                {selectedOrder.status === "delivered" && !selectedOrder.rating && (
                  <div className="pt-3 border-t border-border/30">
                    <p className="text-xs font-semibold text-foreground mb-2">Rate your order</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} type="button" aria-label={`Rate ${s} star${s !== 1 ? "s" : ""}`} disabled={savingRating}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => handleRate(selectedOrder.id, s)}
                          className="flex-1 flex items-center justify-center py-2 rounded-xl border border-border/40 bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors active:scale-90 touch-manipulation">
                          <Star className={`w-5 h-5 transition-colors ${s <= (hoverRating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {selectedOrder.rating != null && selectedOrder.rating > 0 && (
                  <div className="pt-2 flex items-center gap-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= selectedOrder.rating! ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />)}
                    <span className="text-[10px] text-muted-foreground ml-1">Your rating</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {selectedOrder.status === "delivered" && (
                    <Button variant="outline" onClick={() => {
                      navigate(`/eats/restaurant/${selectedOrder.restaurant_id}`);
                      setSelectedOrder(null);
                    }} className="flex-1 rounded-xl font-bold text-xs gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" /> Reorder
                    </Button>
                  )}
                  {activeStatuses.includes(selectedOrder.status) && (
                    <Button onClick={() => {
                      navigate(`/eats/track/${selectedOrder.id}`);
                      setSelectedOrder(null);
                    }} className="flex-1 rounded-xl font-bold text-xs gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Track Order
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PullToRefresh>
  );
}
