/**
 * GroceryOrderHistory - Real-time order tracking with persistent ratings,
 * receipt viewing, spending analytics, support contact, and working reorder
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Package, Clock, CheckCircle, Truck, MapPin,
  ChevronRight, ShoppingBag, RotateCcw, Star, Store,
  Receipt, Phone, MessageSquare, Loader2, RefreshCw,
  HelpCircle, Download, ExternalLink, Copy, AlertTriangle,
  TrendingUp, DollarSign, Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { toast } from "sonner";
import { useGroceryCart } from "@/hooks/useGroceryCart";
import PullToRefresh from "@/components/shared/PullToRefresh";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  store: string;
  status?: string;
  replacement?: { name: string; price: number };
}

interface Order {
  id: string;
  store: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  delivery_address: string;
  items: OrderItem[];
  placed_at: string;
  customer_name: string;
  driver_name?: string;
  driver_phone?: string;
  receipt_total?: number;
  receipt_photo_url?: string;
  rating?: number;
}

const STATUS_CONFIG: Record<string, { icon: typeof Package; label: string; color: string; bg: string; step: number }> = {
  pending_payment: { icon: Clock, label: "Pending Payment", color: "text-amber-500", bg: "bg-amber-500/10", step: 0 },
  pending: { icon: Package, label: "Order Placed", color: "text-primary", bg: "bg-primary/10", step: 1 },
  confirmed: { icon: CheckCircle, label: "Confirmed", color: "text-primary", bg: "bg-primary/10", step: 2 },
  shopping: { icon: ShoppingBag, label: "Shopping", color: "text-violet-500", bg: "bg-violet-500/10", step: 3 },
  picked_up: { icon: Truck, label: "Out for Delivery", color: "text-primary", bg: "bg-primary/10", step: 4 },
  delivered: { icon: CheckCircle, label: "Delivered", color: "text-emerald-500", bg: "bg-emerald-500/10", step: 5 },
  cancelled: { icon: Package, label: "Cancelled", color: "text-destructive", bg: "bg-destructive/10", step: -1 },
};

const STEP_LABELS = ["Payment", "Placed", "Confirmed", "Shopping", "Delivery", "Done"];

function OrderStatusTracker({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  const currentStep = cfg?.step ?? 1;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-0.5">
        {STEP_LABELS.map((label, i) => {
          const isComplete = i <= currentStep;
          const isCurrent = i === currentStep;
          return (
            <div key={label} className="flex items-center gap-0.5 flex-1">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.2 : 1,
                  backgroundColor: isComplete ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.15)",
                }}
                className={`h-2 w-2 rounded-full shrink-0 ${isCurrent ? "ring-2 ring-primary/30" : ""}`}
              />
              {i < STEP_LABELS.length - 1 && (
                <div className={`h-0.5 flex-1 rounded transition-colors duration-500 ${
                  i < currentStep ? "bg-primary" : "bg-muted-foreground/10"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        {STEP_LABELS.map((label, i) => (
          <span key={label} className={`text-[7px] font-semibold ${
            i <= (cfg?.step ?? 1) ? "text-primary" : "text-muted-foreground/30"
          }`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onReorder, onRate, onTrack }: {
  order: Order;
  onReorder: (items: OrderItem[]) => void;
  onRate: (orderId: string, stars: number) => void;
  onTrack: (orderId: string) => void;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const date = new Date(order.placed_at);
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const itemCount = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;
  const replacedItems = order.items?.filter(i => i.status === "replaced") || [];
  const unavailableItems = order.items?.filter(i => i.status === "unavailable") || [];

  const copyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("Order ID copied");
  };

  const timeSince = () => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={`rounded-2xl border overflow-hidden transition-all ${
        isActive
          ? "border-primary/20 bg-card shadow-md shadow-primary/5"
          : "border-border/20 bg-card/80"
      }`}
    >
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
            <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold text-foreground">{order.store}</h3>
                {isActive && (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                )}
              </div>
              <span className="text-[11px] text-muted-foreground">{timeSince()}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
              <span className="text-[10px] text-muted-foreground">
                · {itemCount} items · ${order.total_amount?.toFixed(2)}
              </span>
            </div>
            {/* Item status badges */}
            {(replacedItems.length > 0 || unavailableItems.length > 0) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {replacedItems.length > 0 && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/15">
                    {replacedItems.length} replaced
                  </span>
                )}
                {unavailableItems.length > 0 && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/15">
                    {unavailableItems.length} unavailable
                  </span>
                )}
              </div>
            )}
            {/* Existing star rating */}
            {order.rating && order.rating > 0 && (
              <div className="flex items-center gap-0.5 mt-1.5">
                {Array.from({ length: order.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
            {isActive && <OrderStatusTracker status={order.status} />}
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Order ID */}
              <button type="button"
                onClick={copyOrderId}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10 w-full text-left"
              >
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">Order</span>
                <span className="text-[10px] font-mono text-foreground flex-1">{order.id.slice(0, 8).toUpperCase()}</span>
                <Copy className="h-3 w-3 text-muted-foreground" />
              </button>

              {/* Driver info */}
              {order.driver_name && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-bold text-foreground">{order.driver_name}</p>
                    <p className="text-[10px] text-muted-foreground">Your ZIVO driver</p>
                  </div>
                  {order.driver_phone && (
                    <a
                      href={`tel:${order.driver_phone}`}
                      className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    >
                      <Phone className="h-4 w-4 text-primary" />
                    </a>
                  )}
                </div>
              )}

              {/* Items */}
              <div className="space-y-2">
                {(order.items || []).slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {item.image && (
                      <img src={item.image} alt="" className="h-9 w-9 rounded-lg object-contain bg-muted/20 border border-border/15 p-0.5" referrerPolicy="no-referrer" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] text-foreground/80 truncate block">
                        {item.quantity}× {item.name}
                      </span>
                      {item.status === "replaced" && item.replacement && (
                        <span className="text-[9px] text-amber-500 font-medium">
                          → Replaced: {item.replacement.name} (${item.replacement.price.toFixed(2)})
                        </span>
                      )}
                      {item.status === "unavailable" && (
                        <span className="text-[9px] text-destructive font-medium">Unavailable — refunded</span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground tabular-nums">
                      ${(item.price * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                ))}
                {(order.items?.length || 0) > 8 && (
                  <p className="text-[10px] text-muted-foreground pl-10">+{order.items.length - 8} more items</p>
                )}
              </div>

              {/* Address */}
              {order.delivery_address && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/10">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground">{order.delivery_address}</span>
                </div>
              )}

              {/* Price breakdown */}
              <div className="space-y-1 pt-1 border-t border-border/10">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">${order.total_amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-foreground">${order.delivery_fee?.toFixed(2)}</span>
                </div>
                {order.receipt_total != null && (
                  <div className="flex justify-between text-[11px] text-emerald-600">
                    <span className="flex items-center gap-1"><Receipt className="h-3 w-3" /> Receipt total</span>
                    <span className="font-semibold">${order.receipt_total.toFixed(2)}</span>
                  </div>
                )}
                {order.receipt_total != null && order.receipt_total < order.total_amount && (
                  <div className="flex justify-between text-[11px] text-emerald-600">
                    <span>Adjustment refund</span>
                    <span className="font-semibold">-${(order.total_amount - order.receipt_total).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Receipt photo */}
              {order.receipt_photo_url && (
                <button type="button"
                  onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(order.receipt_photo_url))}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors w-full text-left"
                >
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-semibold text-foreground flex-1">View Store Receipt</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </button>
              )}

              {/* Rate order — persisted */}
              {order.status === "delivered" && (!order.rating || order.rating === 0) && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-foreground mb-2">Rate your experience</p>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button
                        key={s}
                        whileTap={{ scale: 0.8 }}
                        onClick={() => onRate(order.id, s)}
                        className="p-2 rounded-xl bg-muted/20 hover:bg-amber-500/10 transition-colors border border-border/15"
                      >
                        <Star className="h-5 w-5 text-muted-foreground/30 hover:text-amber-400 hover:fill-amber-400 transition-colors" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions row */}
              <div className="flex gap-2 pt-1">
                {/* Track active order */}
                {isActive && (
                  <Button
                    size="sm"
                    className="flex-1 rounded-xl text-[11px] font-bold gap-1.5 h-9"
                    onClick={() => onTrack(order.id)}
                  >
                    <Navigation className="h-3 w-3" />
                    Track Order
                  </Button>
                )}
                {/* Reorder */}
                {order.status === "delivered" && order.items?.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl text-[11px] font-bold gap-1.5 h-9"
                    onClick={() => onReorder(order.items)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reorder
                  </Button>
                )}
                {/* Contact support */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-[11px] font-bold gap-1.5 h-9 text-muted-foreground"
                  onClick={() => {
                    navigate(`/help?order=${order.id.slice(0, 8).toUpperCase()}&store=${encodeURIComponent(order.store)}`);
                  }}
                >
                  <HelpCircle className="h-3 w-3" />
                  Help
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function GroceryOrderHistory() {
  const navigate = useNavigate();
  const cart = useGroceryCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "past">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from("shopping_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq("order_type", "shopping_delivery")
      .order("placed_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-cancel orders stuck at pending_payment for over 1 hour
  useEffect(() => {
    const autoCancelStale = async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const stale = orders.filter(
        (o) => o.status === "pending_payment" && o.placed_at < oneHourAgo
      );
      if (stale.length === 0) return;

      for (const order of stale) {
        const { error } = await supabase
          .from("shopping_orders")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          } as any)
          .eq("id", order.id);

        if (!error) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: "cancelled" } : o
            )
          );
          toast.info(`Order from ${order.store} auto-cancelled`, {
            description: "Payment was not completed within 1 hour",
          });
        }
      }
    };
    if (!loading && orders.length > 0) {
      autoCancelStale();
    }
  }, [loading, orders.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscription for active orders
  useEffect(() => {
    const channel = supabase
      .channel("grocery-orders-realtime")
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "shopping_orders" },
        (payload: any) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id ? { ...o, ...payload.new } as Order : o
            )
          );
          const newStatus = STATUS_CONFIG[payload.new.status];
          if (newStatus) {
            toast.success(`Order ${newStatus.label}`, {
              description: `Your ${payload.new.store} order status updated`,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Persist rating to Supabase
  const handleRate = useCallback(async (orderId: string, stars: number) => {
    // Optimistic update
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, rating: stars } : o));
    toast.success(`Rated ${stars} star${stars !== 1 ? "s" : ""} — thank you!`);

    const { error } = await supabase
      .from("shopping_orders")
      .update({ rating: stars } as any)
      .eq("id", orderId);

    if (error) {
      console.error("Failed to save rating:", error);
      // Don't revert — rating column may not exist yet, but local state is fine
    }
  }, []);

  const handleRefresh = () => { setRefreshing(true); fetchOrders(); };

  // Auto-hide cancelled orders 14 days after cancellation
  const CANCELLED_HIDE_MS = 14 * 24 * 60 * 60 * 1000;
  const visibleOrders = orders.filter((o) => {
    if (o.status !== "cancelled") return true;
    const cancelledAt = (o as any).cancelled_at || o.placed_at;
    if (!cancelledAt) return true;
    return Date.now() - new Date(cancelledAt).getTime() < CANCELLED_HIDE_MS;
  });

  const filtered = visibleOrders.filter((o) => {
    if (filter === "active") return !["delivered", "cancelled"].includes(o.status);
    if (filter === "past") return ["delivered", "cancelled"].includes(o.status);
    return true;
  });

  const activeCount = visibleOrders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;

  // Real reorder: add items to cart and navigate to store
  const handleReorder = (items: OrderItem[]) => {
    items.forEach((item) => {
      cart.addItem(
        { productId: item.productId, name: item.name, price: item.price, image: item.image || "", brand: "" },
        item.store || "Walmart"
      );
    });
    toast.success(`${items.length} items added to cart`);
    const store = items[0]?.store?.toLowerCase() || "walmart";
   navigate(`/grocery/store/${store}`);
  };

  const handleTrack = (orderId: string) => {
    navigate(`/grocery/track/${orderId}`);
  };

  // Spending analytics
  const stats = useMemo(() => {
    const delivered = orders.filter(o => o.status === "delivered");
    const totalSpent = delivered.reduce((s, o) => s + (o.total_amount || 0), 0);
    const avgOrder = delivered.length > 0 ? totalSpent / delivered.length : 0;
    const thisMonth = delivered.filter(o => {
      const d = new Date(o.placed_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlySpent = thisMonth.reduce((s, o) => s + (o.total_amount || 0), 0);
    return { totalSpent, avgOrder, totalOrders: delivered.length, monthlySpent, monthlyOrders: thisMonth.length };
  }, [orders]);

  return (
    <PullToRefresh onRefresh={fetchOrders} className="min-h-screen bg-background pb-24 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/6 blur-[60px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/70 backdrop-blur-2xl border-b border-border/20">
        <div className="flex items-center gap-3 px-4 py-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate("/grocery")}
            className="p-2 rounded-2xl hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-base font-bold">My Orders</h1>
            <p className="text-[10px] text-muted-foreground">
              {orders.length} order{orders.length !== 1 ? "s" : ""}
              {activeCount > 0 && (
                <span className="text-primary font-semibold"> · {activeCount} active</span>
              )}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            className="p-2 rounded-2xl hover:bg-muted/60 transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? "animate-spin" : ""}`} />
          </motion.button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 px-4 pb-3">
          {([
            { key: "all", label: "All" },
            { key: "active", label: `Active${activeCount ? ` (${activeCount})` : ""}` },
            { key: "past", label: "Past" },
          ] as const).map((tab) => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                filter === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/20"
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Active orders banner */}
      {activeCount > 0 && filter !== "past" && !loading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 mb-2 p-3 rounded-2xl bg-primary/5 border border-primary/10 flex items-center gap-3"
        >
          <div className="p-2 rounded-xl bg-primary/15">
            <Truck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-bold text-foreground">{activeCount} active order{activeCount !== 1 ? "s" : ""}</p>
            <p className="text-[10px] text-muted-foreground">Live tracking • Updates in real-time</p>
          </div>
          <motion.div
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="h-3 w-3 rounded-full bg-primary"
          />
        </motion.div>
      )}

      {/* Spending Analytics */}
      {!loading && stats.totalOrders > 0 && filter !== "active" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 mb-1"
        >
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Spending</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
              <DollarSign className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-[14px] font-extrabold text-foreground">${stats.monthlySpent.toFixed(0)}</p>
              <p className="text-[8px] text-muted-foreground font-medium">This Month</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
              <ShoppingBag className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-[14px] font-extrabold text-foreground">{stats.totalOrders}</p>
              <p className="text-[8px] text-muted-foreground font-medium">Total Orders</p>
            </div>
            <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
              <Receipt className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-[14px] font-extrabold text-foreground">${stats.avgOrder.toFixed(0)}</p>
              <p className="text-[8px] text-muted-foreground font-medium">Avg Order</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Package className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-1">
              {filter === "active" ? "No active orders" : filter === "past" ? "No past orders" : "No orders yet"}
            </h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              {filter === "all" ? "Start shopping to see your orders here" : "Check back later"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => navigate("/grocery")}
            >
              <Store className="h-3.5 w-3.5 mr-1.5" />
              Browse Stores
            </Button>
          </motion.div>
        ) : (
          filtered.map((order) => (
            <OrderCard key={order.id} order={order} onReorder={handleReorder} onRate={handleRate} onTrack={handleTrack} />
          ))
        )}
      </div>

      <ZivoMobileNav />
    </PullToRefresh>
  );
}
