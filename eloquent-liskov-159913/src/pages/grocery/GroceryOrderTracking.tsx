/**
 * GroceryOrderTracking — Live order tracking with real-time status,
 * driver info, animated stepper, ETA countdown, and item details.
 * Uses Supabase Realtime for push updates.
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Clock, Copy, MapPin, Package,
  Phone, ShoppingBag, Sparkles, Star, Truck, User,
  ChevronDown, ChevronUp, MessageSquare, Navigation, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────
interface OrderData {
  id: string;
  store: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  final_total: number | null;
  delivery_address: string | null;
  customer_name: string | null;
  driver_id: string | null;
  placed_at: string | null;
  accepted_at: string | null;
  shopping_started_at: string | null;
  shopping_completed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  driver_notes: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
    status?: string;
    replacementName?: string;
  }>;
}

interface DriverInfo {
  full_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  vehicle_model: string | null;
  vehicle_type: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

// ─── Step config ─────────────────────────────────────────────────────
const STEPS = [
  { key: "pending",   icon: CheckCircle,  label: "Order Placed",    desc: "We've received your order" },
  { key: "confirmed", icon: User,         label: "Driver Assigned",  desc: "A ZIVO driver accepted your order" },
  { key: "shopping",  icon: ShoppingBag,  label: "Shopping",         desc: "Your driver is shopping your items" },
  { key: "delivering",icon: Truck,        label: "On the Way",       desc: "Your order is being delivered" },
  { key: "delivered", icon: CheckCircle,  label: "Delivered",        desc: "Your order has arrived!" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0, confirmed: 1, accepted: 1, shopping: 2, delivering: 3, delivered: 4, completed: 4,
};

function getStepIndex(status: string): number {
  return STATUS_ORDER[status] ?? 0;
}

function formatEta(placedAt: string | null, status: string): string {
  if (status === "delivered" || status === "completed") return "Delivered";
  if (!placedAt) return "Calculating...";
  const elapsed = Math.floor((Date.now() - new Date(placedAt).getTime()) / 60000);
  const baseEta = status === "delivering" ? 10 : status === "shopping" ? 25 : 45;
  const remaining = Math.max(0, baseEta - Math.min(elapsed, baseEta - 1));
  return remaining <= 1 ? "Any moment now" : `~${remaining} min`;
}

function timeAgo(ts: string | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
}

// ─── Component ───────────────────────────────────────────────────────
export default function GroceryOrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [driver, setDriver] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showItems, setShowItems] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every 30s for ETA refresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch order + driver
  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    async function fetchOrder() {
      const { data, error } = await supabase
        .from("shopping_orders")
        .select("id, store, status, total_amount, delivery_fee, final_total, delivery_address, customer_name, driver_id, placed_at, accepted_at, shopping_started_at, shopping_completed_at, picked_up_at, delivered_at, cancelled_at, driver_notes, items")
        .eq("id", orderId)
        .single();

      if (error || !data) {
        console.error("Failed to fetch order:", error);
        setError("Order not found. Please check the order ID and try again.");
        setLoading(false);
        return;
      }

      const orderData = {
        ...data,
        items: Array.isArray(data.items) ? (data.items as any[]) : [],
      } as OrderData;
      setOrder(orderData);
      setLoading(false);

      // Fetch driver info if assigned
      if (data.driver_id) {
        fetchDriver(data.driver_id);
      }
    }

    async function fetchDriver(driverId: string) {
      const { data } = await supabase
        .from("drivers_public" as any)
        .select("full_name, avatar_url, rating, vehicle_model, vehicle_type, current_lat, current_lng")
        .eq("id", driverId)
        .single();

      if (data) setDriver(data as unknown as DriverInfo);
    }

    fetchOrder();

    // Realtime subscription
    const channel = supabase
      .channel(`order-track-${orderId}`)
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "shopping_orders", filter: `id=eq.${orderId}` },
        (payload: any) => {
          const updated = payload.new;
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              ...updated,
              items: Array.isArray(updated.items) ? updated.items : prev.items,
            };
          });
          // Fetch driver if newly assigned
          if (updated.driver_id && !driver) {
            fetchDriver(updated.driver_id);
          }
          // Toast on status change
          const label = STEPS.find(s => s.key === updated.status)?.label;
          if (label) toast.info(`Status: ${label}`);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const stepIndex = useMemo(() => order ? getStepIndex(order.status) : 0, [order?.status]);
  const eta = useMemo(() => formatEta(order?.placed_at ?? null, order?.status ?? "pending"), [order?.placed_at, order?.status, now]);
  const isCancelled = order?.status === "cancelled";
  const isComplete = order?.status === "delivered" || order?.status === "completed";
  const progressPct = isComplete ? 100 : isCancelled ? 0 : Math.min(95, ((stepIndex + 0.5) / (STEPS.length - 1)) * 100);

  const copyId = () => {
    if (orderId) { navigator.clipboard.writeText(orderId); toast.success("Order ID copied"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-md mx-auto px-5 pt-14 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <ZivoMobileNav />
      </div>
    );
  }

  if (error || (!order && !loading)) {
    return (
      <div className="min-h-screen bg-background pb-24 flex flex-col items-center justify-center px-6">
        <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Unable to Load Order</h1>
        <p className="text-sm text-muted-foreground mb-6 text-center">{error || "This order may have been removed or the link is invalid."}</p>
        <Button onClick={() => navigate("/grocery/orders")} className="rounded-2xl">View My Orders</Button>
        <ZivoMobileNav />
      </div>
    );
  }

  const itemCount = order.items.reduce((s, i) => s + (i.quantity || 1), 0);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24 safe-area-top">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/8 blur-[80px]" />
      </div>

      <div className="relative max-w-md mx-auto px-5">
        {/* Header */}
        <div className="flex items-center gap-3 pt-12 pb-4">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-extrabold tracking-tight">Track Order</h1>
            <p className="text-[11px] text-muted-foreground">from {order.store}</p>
          </div>
          <button type="button" onClick={copyId} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
            <span className="text-[10px] font-mono font-bold">{orderId?.slice(0, 8).toUpperCase()}</span>
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        {/* Status hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl p-5 mb-4 border ${
            isCancelled
              ? "bg-destructive/5 border-destructive/15"
              : isComplete
                ? "bg-emerald-500/5 border-emerald-500/15"
                : "bg-primary/5 border-primary/15"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                isCancelled ? "bg-destructive/10" : isComplete ? "bg-emerald-500/10" : "bg-primary/10"
              }`}>
                {isCancelled ? (
                  <Package className="h-5 w-5 text-destructive" />
                ) : isComplete ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                    <Navigation className="h-5 w-5 text-primary" />
                  </motion.div>
                )}
              </div>
              <div>
                <p className="text-[14px] font-extrabold">
                  {isCancelled ? "Order Cancelled" : STEPS[stepIndex]?.label || "Processing"}
                </p>
                <p className="text-[11px] text-muted-foreground">{STEPS[stepIndex]?.desc}</p>
              </div>
            </div>
            {!isCancelled && (
              <div className="text-right">
                <p className="text-[18px] font-black text-primary">{eta}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">ETA</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isCancelled ? "bg-destructive" : isComplete ? "bg-emerald-500" : "bg-primary"
              }`}
            />
          </div>
        </motion.div>

        {/* Driver card */}
        <AnimatePresence>
          {driver && !isCancelled && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl bg-card border border-border/20 p-4 mb-4"
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Your Driver</p>
              <div className="flex items-center gap-3">
                <div className="relative">
                  {driver.avatar_url ? (
                    <img src={driver.avatar_url} alt="" className="h-12 w-12 rounded-xl object-cover border-2 border-primary/20" />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-card" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate">{driver.full_name || "ZIVO Driver"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {driver.rating && (
                      <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {driver.rating.toFixed(1)}
                      </span>
                    )}
                    {driver.vehicle_model && (
                      <span className="text-[11px] text-muted-foreground">
                        · {driver.vehicle_model}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </button>
                  <button type="button" className="h-10 w-10 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Phone className="h-4 w-4 text-primary" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delivery stepper */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-card border border-border/20 p-5 mb-4"
        >
          <h3 className="text-[12px] font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Order Progress
          </h3>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isComplete = i < stepIndex;
              const isCurrent = i === stepIndex;
              const isPending = i > stepIndex;
              const StepIcon = step.icon;
              const timestamp = i === 0 ? order.placed_at
                : i === 1 ? order.accepted_at
                : i === 2 ? order.shopping_started_at
                : i === 3 ? order.picked_up_at
                : order.delivered_at;

              return (
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="flex items-start gap-3.5 relative"
                >
                  {i < STEPS.length - 1 && (
                    <div className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] transition-colors ${
                      isComplete ? "bg-primary" : isCurrent ? "bg-primary/30" : "bg-border/30"
                    }`} />
                  )}
                  <div className={`relative z-10 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isComplete
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : isCurrent
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/20"
                        : "bg-muted/30 text-muted-foreground/30 border border-border/20"
                  }`}>
                    {isComplete ? <CheckCircle className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                    {isCurrent && !isCancelled && (
                      <motion.div
                        className="absolute inset-0 rounded-xl bg-primary/20"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div className="pb-5 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-[12px] font-bold ${
                        isPending ? "text-muted-foreground/40" : "text-foreground"
                      }`}>
                        {step.label}
                      </p>
                      {timestamp && (
                        <span className="text-[9px] text-muted-foreground font-medium">{timeAgo(timestamp)}</span>
                      )}
                    </div>
                    <p className={`text-[10px] mt-0.5 ${isPending ? "text-muted-foreground/25" : "text-muted-foreground"}`}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Delivery address */}
        {order.delivery_address && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-muted/10 border border-border/15 p-3.5 mb-4 flex items-start gap-2.5"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-foreground">{order.customer_name || "Delivery"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{order.delivery_address}</p>
            </div>
          </motion.div>
        )}

        {/* Items section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl bg-card border border-border/20 overflow-hidden mb-4"
        >
          <button type="button"
            onClick={() => setShowItems(v => !v)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-[12px] font-bold">{itemCount} Items</span>
              <span className="text-[11px] font-bold text-primary">${(order.final_total || order.total_amount).toFixed(2)}</span>
            </div>
            {showItems ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showItems && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2 border-t border-border/10 pt-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-10 w-10 rounded-lg object-contain bg-muted/20 border border-border/15 p-0.5" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted/20 border border-border/15 flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold truncate">{item.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">×{item.quantity || 1}</span>
                          {item.status === "replaced" && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold">Replaced</span>
                          )}
                          {item.status === "unavailable" && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive font-bold">Unavailable</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold">${(item.price * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-border/10">
                    <span className="text-[11px] text-muted-foreground">Delivery Fee</span>
                    <span className="text-[11px] font-bold">${order.delivery_fee.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold">Total</span>
                    <span className="text-[14px] font-extrabold text-primary">${(order.final_total || order.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Driver notes */}
        {order.driver_notes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl bg-amber-500/5 border border-amber-500/15 p-3.5 mb-4 flex items-start gap-2.5"
          >
            <MessageSquare className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Driver Note</p>
              <p className="text-[11px] text-foreground mt-0.5">{order.driver_notes}</p>
            </div>
          </motion.div>
        )}

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="grid grid-cols-3 gap-2.5 mb-6"
        >
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
            <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-[11px] font-bold">{eta}</p>
            <p className="text-[8px] text-muted-foreground">ETA</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <Package className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[11px] font-bold">{itemCount}</p>
            <p className="text-[8px] text-muted-foreground">Items</p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[11px] font-bold">{order.store}</p>
            <p className="text-[8px] text-muted-foreground">Store</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-2.5 mb-6"
        >
          <Button onClick={() => navigate("/grocery/orders")} variant="outline" className="flex-1 rounded-2xl h-11 text-[12px]">
            My Orders
          </Button>
          <Button onClick={() => navigate("/grocery")} className="flex-1 rounded-2xl h-11 text-[12px]">
            Shop More
          </Button>
        </motion.div>

        {/* Cancel — only while order hasn't been picked up yet */}
        {!isComplete && !isCancelled && order && (
          <CancelGroceryButton orderId={order.id} />
        )}

        {/* Download receipt — only for paid orders */}
        {order && (order as any).payment_status === "paid" && (
          <DownloadGroceryReceiptButton orderId={order.id} />
        )}
      </div>

      <ZivoMobileNav />
    </div>
  );
}

function DownloadGroceryReceiptButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const onDownload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("grocery-order-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      const blob = data instanceof Blob ? data : new Blob([data as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ZIVO-grocery-${orderId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Receipt downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Could not download receipt");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button
      variant="outline"
      onClick={onDownload}
      disabled={loading}
      className="w-full rounded-2xl mb-6 font-bold"
    >
      {loading ? "Generating…" : "Download receipt"}
    </Button>
  );
}

function CancelGroceryButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{ eligible: boolean; reason_label: string; refund_cents: number; provider: string } | null>(null);

  const onPrep = async () => {
    setConfirming(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-grocery-order", {
        body: { order_id: orderId, preview: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPreview(data as any);
    } catch (e: any) {
      toast.error(e?.message || "Could not check refund policy");
      setConfirming(false);
    }
  };

  const onConfirm = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-grocery-order", {
        body: { order_id: orderId, reason: "customer_initiated" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as any;
      if (r.refund_cents > 0) {
        toast.success("Order cancelled", { description: `$${(r.refund_cents / 100).toFixed(2)} refund ${r.payment_status === "refunded" ? "issued" : "in progress"} via ${r.provider || "your payment method"}.` });
      } else {
        toast.success("Order cancelled");
      }
      setConfirming(false);
      setPreview(null);
    } catch (e: any) {
      toast.error(e?.message || "Cancellation failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!confirming) {
    return (
      <Button
        variant="outline"
        onClick={onPrep}
        className="w-full rounded-2xl mb-6 font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        Cancel order
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 mb-6 space-y-3">
      <div>
        <p className="text-sm font-bold text-destructive">Cancel this order?</p>
        {preview ? (
          <p className="text-xs text-muted-foreground mt-1">
            {preview.reason_label}
            {preview.refund_cents > 0 ? ` · $${(preview.refund_cents / 100).toFixed(2)} back to ${preview.provider}` : " · No refund will be issued"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">Checking refund policy…</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => { setConfirming(false); setPreview(null); }} disabled={submitting} className="flex-1 rounded-xl">Keep order</Button>
        <Button variant="destructive" onClick={onConfirm} disabled={submitting || !preview} className="flex-1 rounded-xl">
          {submitting ? "Cancelling…" : "Cancel & refund"}
        </Button>
      </div>
    </div>
  );
}
