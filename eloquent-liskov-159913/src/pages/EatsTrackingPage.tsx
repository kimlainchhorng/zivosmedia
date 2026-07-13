/**
 * EatsTrackingPage — Real-time food order tracking
 * Subscribes to food_orders status changes via Supabase Realtime
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Clock, Flame, Package, Truck,
  Navigation, MapPin, Phone, MessageSquare, Star, PartyPopper,
  Loader2, UtensilsCrossed, RefreshCw, Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CrossServiceCTAs from "@/components/shared/CrossServiceCTAs";

type OrderStatus =
  | "pending" | "confirmed" | "preparing" | "ready"
  | "picked_up" | "out_for_delivery" | "delivered" | "cancelled";

interface OrderData {
  id: string;
  status: string;
  tracking_code: string | null;
  delivery_address: string;
  total_amount: number;
  payment_type: string | null;
  tip_amount: number | null;
  special_instructions: string | null;
  created_at: string | null;
  restaurant_id: string;
  driver_id: string | null;
  last_driver_lat: number | null;
  last_driver_lng: number | null;
  eta_minutes: number | null;
  items: any;
}

const trackingSteps: { status: OrderStatus; label: string; icon: any; description: string }[] = [
  { status: "pending", label: "Order Placed", icon: CheckCircle, description: "Your order has been submitted" },
  { status: "confirmed", label: "Confirmed", icon: UtensilsCrossed, description: "Restaurant accepted your order" },
  { status: "preparing", label: "Preparing", icon: Flame, description: "Your food is being prepared" },
  { status: "ready", label: "Ready", icon: Package, description: "Ready for pickup" },
  { status: "picked_up", label: "Picked Up", icon: Truck, description: "Driver has your food" },
  { status: "out_for_delivery", label: "On the Way", icon: Navigation, description: "Almost there!" },
  { status: "delivered", label: "Delivered", icon: PartyPopper, description: "Enjoy your meal!" },
];

const statusIndex = (s: string): number => {
  const idx = trackingSteps.findIndex(st => st.status === s);
  return idx >= 0 ? idx : 0;
};

export default function EatsTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantName, setRestaurantName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  // Fetch order
  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from("food_orders")
        .select("id, status, tracking_code, delivery_address, total_amount, payment_type, tip_amount, special_instructions, created_at, restaurant_id, driver_id, last_driver_lat, last_driver_lng, eta_minutes, items")
        .eq("id", orderId)
        .single();
      if (error) {
        console.error("[EatsTracking] Fetch error:", error);
        toast.error("Order not found");
      } else {
        setOrder(data as any);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [orderId]);

  // Fetch restaurant name
  useEffect(() => {
    if (!order?.restaurant_id) return;
    supabase
      .from("restaurants")
      .select("name")
      .eq("id", order.restaurant_id)
      .single()
      .then(({ data }) => {
        if (data) setRestaurantName(data.name);
      });
  }, [order?.restaurant_id]);

  // Realtime subscription for order status
  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`eats-order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "food_orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const updated = payload.new as any;
          setOrder(prev => prev ? { ...prev, ...updated } : prev);
          
          if (updated.status === "confirmed") toast.success("Restaurant confirmed your order! 🎉");
          if (updated.status === "preparing") toast.success("Your food is being prepared 👨‍🍳");
          if (updated.status === "ready") toast.success("Food is ready for pickup! 🍽️");
          if (updated.status === "picked_up") toast.success("Driver picked up your food 📦");
          if (updated.status === "out_for_delivery") toast.success("On the way to you! 🚗");
          if (updated.status === "delivered") toast.success("Order delivered! Enjoy! 🎉");
          if (updated.status === "cancelled") toast.error("Order was cancelled ❌");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const currentIdx = statusIndex(order?.status || "pending");
  const isDelivered = order?.status === "delivered";
  const isCancelled = order?.status === "cancelled";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <UtensilsCrossed className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">Order not found</p>
        <Button variant="outline" onClick={() => navigate("/eats")} className="rounded-xl">Back to Eats</Button>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-20 bg-background/95 backdrop-blur-2xl border-b border-border/30">
        <div className="px-4 py-3 flex items-center gap-3 safe-area-top">
          <motion.button whileTap={{ scale: 0.88 }} onClick={() => navigate("/eats")}
            className="w-10 h-10 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center touch-manipulation">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-ig-gradient">Order Tracking</h1>
            <p className="text-[10px] text-muted-foreground font-mono">#{order.tracking_code || order.id.slice(0, 8)}</p>
          </div>
          {!isDelivered && !isCancelled && (
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold animate-pulse">
              Live
            </Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-5">
        {/* Status Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-2xl p-6 text-center", 
            isCancelled ? "bg-destructive/5 border border-destructive/20" :
            isDelivered ? "bg-primary/5 border border-primary/20" :
            "bg-gradient-to-br from-primary/5 to-orange-500/5 border border-primary/20")}>
          {isCancelled ? (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Order Cancelled</h2>
              <p className="text-sm text-muted-foreground mt-1">This order has been cancelled</p>
            </>
          ) : isDelivered ? (
            <>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-primary/30">
                <PartyPopper className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h2 className="text-lg font-bold text-foreground">Order Delivered! 🎉</h2>
              <p className="text-sm text-muted-foreground mt-1">Enjoy your meal from {restaurantName}</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                {(() => {
                  const StepIcon = trackingSteps[currentIdx]?.icon || Clock;
                  return <StepIcon className="w-8 h-8 text-primary animate-pulse" />;
                })()}
              </div>
              <h2 className="text-lg font-bold text-foreground">
                {trackingSteps[currentIdx]?.label || "Processing"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {trackingSteps[currentIdx]?.description}
              </p>
              {order.eta_minutes && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-primary font-bold text-sm">
                  <Clock className="w-4 h-4" />
                  <span>ETA: ~{order.eta_minutes} min</span>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Timeline */}
        {!isCancelled && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border border-border/40 p-4">
            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" /> Order Progress
            </h3>
            <div className="space-y-1">
              {trackingSteps.map((step, i) => {
                const Icon = step.icon;
                const isDone = i <= currentIdx;
                const isActive = i === currentIdx;
                return (
                  <div key={step.status} className={cn("flex items-center gap-3 p-2.5 rounded-xl transition-all",
                    isDone ? "opacity-100" : "opacity-30")}>
                    <div className="relative">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        isDone ? "bg-primary/10" : "bg-muted/30")}>
                        <Icon className={cn("w-4 h-4", isDone ? "text-primary" : "text-muted-foreground",
                          isActive && "animate-pulse")} />
                      </div>
                      {i < trackingSteps.length - 1 && (
                        <div className={cn("absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-4",
                          i < currentIdx ? "bg-primary/30" : "bg-border/30")} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-xs font-bold", isDone ? "text-foreground" : "text-muted-foreground")}>
                        {step.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{step.description}</p>
                    </div>
                    {isDone && i < currentIdx && <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />}
                    {isActive && !isDelivered && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Order Details */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-primary" /> Order Details
          </h3>
          {restaurantName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">From:</span>
              <span className="font-bold text-foreground">{restaurantName}</span>
            </div>
          )}
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-bold text-foreground">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/30 pt-2 flex justify-between text-sm">
            <span className="font-bold text-foreground">Total</span>
            <span className="font-bold text-xl text-primary">${order.total_amount.toFixed(2)}</span>
          </div>
        </motion.div>

        {/* Delivery Info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Delivering to</p>
              <p className="text-sm font-bold text-foreground">{order.delivery_address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Payment</p>
              <p className="text-sm font-bold text-foreground capitalize">{order.payment_type || "Card"}</p>
            </div>
          </div>
        </motion.div>

        {/* Rate Order (when delivered) */}
        {isDelivered && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="rounded-2xl bg-card border border-border/40 p-4 text-center">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Rate your experience
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button type="button" key={s} onClick={async () => {
                  setRating(s);
                  await supabase.from("food_orders").update({ rating: s } as any).eq("id", order.id);
                  toast.success(`Rated ${s} stars! Thank you!`);
                }} className="touch-manipulation active:scale-90 transition-transform">
                  <Star className={cn("w-8 h-8 transition-all",
                    rating && s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cross-service follow-ups (reserve table next time, plan a getaway) */}
        {isDelivered && (
          <CrossServiceCTAs
            variant="after-eats-order"
            title="Liked it? Make it a habit."
            context={{
              restaurantId: order.restaurant_id,
              restaurantName: restaurantName,
            }}
          />
        )}

        {/* Share live order link — only while it's still in progress */}
        {!isDelivered && !isCancelled && (
          <button type="button"
            onClick={async () => {
              const url = `${window.location.origin}/share/order/${order.id}`;
              try {
                if ((navigator as any).share) {
                  await (navigator as any).share({
                    title: "Track my ZIVO order",
                    text: "Following my food order — take a peek.",
                    url,
                  });
                } else {
                  await navigator.clipboard.writeText(url);
                  toast.success("Order share link copied");
                }
              } catch {
                toast.error("Could not share order");
              }
            }}
            className="w-full flex items-center gap-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3 text-left active:scale-[0.99] transition-transform touch-manipulation"
          >
            <div className="w-11 h-11 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center text-lg">
              🔗
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
                Share live order
              </div>
              <div className="text-sm font-bold text-foreground">
                Send a public link so a friend can follow along
              </div>
            </div>
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/eats")} className="flex-1 rounded-xl font-bold">
            Back to Eats
          </Button>
          {!isDelivered && !isCancelled && (
            <Button variant="outline" onClick={() => navigate("/chat")} className="flex-1 rounded-xl font-bold gap-1.5">
              <MessageSquare className="w-4 h-4" /> Help
            </Button>
          )}
        </div>

        {/* Cancel — only while order hasn't been picked up yet */}
        {!isDelivered && !isCancelled && (
          <CancelOrderButton orderId={order.id} />
        )}

        {/* Download receipt — only for paid orders */}
        {(order as any).payment_status === "paid" && (
          <DownloadReceiptButton orderId={order.id} trackingCode={order.tracking_code} />
        )}
      </div>
    </div>
  );
}

function DownloadReceiptButton({ orderId, trackingCode }: { orderId: string; trackingCode?: string | null }) {
  const [loading, setLoading] = useState(false);
  const onDownload = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("eats-order-receipt", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      // Edge functions return raw bodies as Blob via supabase-js v2
      const blob = data instanceof Blob ? data : new Blob([data as any], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ZIVO-eats-${trackingCode || orderId.slice(0, 8)}.pdf`;
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
      className="w-full rounded-xl font-bold gap-1.5"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
      Download receipt
    </Button>
  );
}

function CancelOrderButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<{ eligible: boolean; reason_label: string; refund_cents: number; provider: string } | null>(null);

  const onPrep = async () => {
    setConfirming(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-eats-order", {
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
      const { data, error } = await supabase.functions.invoke("cancel-eats-order", {
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
        className="w-full rounded-xl font-bold border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        Cancel order
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-bold text-destructive">Cancel this order?</p>
        {preview ? (
          <p className="text-xs text-muted-foreground mt-1">
            {preview.reason_label}
            {preview.refund_cents > 0 ? ` · $${(preview.refund_cents / 100).toFixed(2)} back to ${preview.provider}` : " · No refund will be issued"}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" /> Checking refund policy…
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => { setConfirming(false); setPreview(null); }}
          disabled={submitting}
          className="flex-1 rounded-xl"
        >
          Keep order
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={submitting || !preview}
          className="flex-1 rounded-xl"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel & refund"}
        </Button>
      </div>
    </div>
  );
}
