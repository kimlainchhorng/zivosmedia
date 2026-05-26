/**
 * GroceryOrderConfirmed - Payment success page after Stripe Checkout
 * Shows real order data, live status, and share/save actions
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import {
  CheckCircle, ShoppingCart, ArrowLeft, Clock, Truck, CreditCard,
  Package, MapPin, Sparkles, ShoppingBag, ChevronRight, Shield,
  Copy, Share2, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const STEPS = [
  { icon: CreditCard, label: "Payment Confirmed", desc: "Your payment was processed securely" },
  { icon: CheckCircle, label: "Order Received", desc: "We're matching you with a driver" },
  { icon: ShoppingBag, label: "Shopping", desc: "Your driver will shop in-store" },
  { icon: Truck, label: "Delivery", desc: "Items delivered to your door" },
];

interface OrderSummary {
  store: string;
  total_amount: number;
  delivery_fee: number;
  items: Array<{ name: string; quantity: number; price: number; image?: string }>;
  delivery_address: string;
  customer_name: string;
  payment_provider?: string | null;
  payment_method?: string | null;
}

export default function GroceryOrderConfirmed() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("order_id") || "";
  const sessionId = params.get("session_id") || "";
  const [updating, setUpdating] = useState(true);
  const [order, setOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (!orderId) { setUpdating(false); return; }

    const confirmOrder = async () => {
      try {
        await supabase
          .from("shopping_orders")
          .update({ status: "pending" } as any)
          .eq("id", orderId);

        const { data } = await supabase
          .from("shopping_orders")
          .select("store, total_amount, delivery_fee, items, delivery_address, customer_name, payment_provider, payment_method")
          .eq("id", orderId)
          .single();

        if (data) setOrder(data as unknown as OrderSummary);

        // Trigger driver dispatch (deployed as `dispatch-order` in the shared
        // Supabase project; folder lives in the zivodriver repo, not here).
        supabase.functions.invoke("dispatch-order", {
          body: { order_id: orderId, order_type: "shopping_delivery" },
        }).catch(() => {/* best-effort */});
      } catch (err) {
        console.error("Failed to update order:", err);
      } finally {
        setUpdating(false);
      }
    };
    confirmOrder();
    localStorage.removeItem("zivo-grocery-cart");
  }, [orderId]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast.success("Order ID copied to clipboard");
  };

  const shareOrder = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ZIVO Grocery Order",
          text: `My grocery order from ${order?.store || "ZIVO"} is on its way!`,
          url: `${getPublicOrigin()}/grocery/orders`,
        });
      } catch {}
    } else {
      copyOrderId();
    }
  };

  const itemTotal = order?.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24 safe-area-top">
      <SEOHead
        title={order ? `Order Confirmed – ${order.store} – ZIVO` : "Order Confirmed – ZIVO"}
        description="Payment confirmed. Your ZIVO driver will shop and deliver your items."
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-emerald-500/8 blur-[80px]" />
        <div className="absolute bottom-1/4 -left-20 h-48 w-48 rounded-full bg-primary/6 blur-[60px]" />
      </div>

      <div className="relative max-w-md mx-auto px-6 pt-12 flex flex-col items-center">
        {/* Success checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0.1 }}
          className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-400/10 flex items-center justify-center mb-6 ring-4 ring-emerald-500/10 shadow-2xl shadow-emerald-500/20"
        >
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="h-12 w-12 text-emerald-500" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-extrabold mb-1 tracking-tight"
        >
          Order Confirmed! ✅
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[13px] text-muted-foreground text-center max-w-xs mb-6"
        >
          {order?.payment_provider === "paypal"
            ? "Your PayPal payment was received. A ZIVO driver will shop and deliver your items."
            : order?.payment_method === "cash" || order?.payment_provider == null
            ? "Your order was placed. Pay the driver in cash upon delivery."
            : order?.payment_method === "aba"
            ? "Your order was placed. Complete your ABA/KHQR payment to confirm."
            : "Your payment was processed securely. A ZIVO driver will shop and deliver your items."}
        </motion.p>

        {/* Order ID + store */}
        {orderId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl bg-muted/20 border border-border/20 px-5 py-3.5 mb-6 w-full"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Order ID</p>
                <button type="button" onClick={copyOrderId} className="flex items-center gap-1.5 mt-0.5 group">
                  <p className="text-[14px] font-mono font-bold text-foreground">{orderId.slice(0, 8).toUpperCase()}</p>
                  <Copy className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </button>
                {order?.store && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">from {order.store}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                  <span className="text-[10px] font-bold text-emerald-600">
                    {order?.payment_method === "cash" ? "Placed" : order?.payment_method === "aba" ? "Pending" : "Paid"}
                  </span>
                </div>
                {order?.total_amount && (
                  <span className="text-[13px] font-bold text-foreground">${order.total_amount.toFixed(2)}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Order items preview */}
        {updating ? (
          <div className="w-full space-y-2 mb-6">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        ) : order?.items && order.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full rounded-2xl bg-card border border-border/20 p-4 mb-6"
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {itemTotal} items ordered
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {order.items.slice(0, 6).map((item, i) => (
                <div key={i} className="shrink-0 flex flex-col items-center w-14">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-11 w-11 rounded-xl object-contain bg-muted/20 border border-border/15 p-0.5" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-muted/20 border border-border/15 flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                  )}
                  <span className="text-[8px] text-muted-foreground mt-1 text-center line-clamp-1">{item.quantity}×</span>
                </div>
              ))}
              {order.items.length > 6 && (
                <div className="shrink-0 h-11 w-11 rounded-xl bg-muted/30 border border-border/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">+{order.items.length - 6}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Delivery stepper */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="w-full rounded-2xl bg-card border border-border/20 p-5 mb-6"
        >
          <h3 className="text-[13px] font-bold mb-4 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Order Progress
          </h3>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isComplete = i <= 1;
              const isCurrent = i === 1;
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex items-start gap-3.5 relative"
                >
                  {i < STEPS.length - 1 && (
                    <div className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] ${isComplete ? "bg-emerald-500" : "bg-border/30"}`} />
                  )}
                  <div className={`relative z-10 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isComplete
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                      : "bg-muted/30 text-muted-foreground/40 border border-border/20"
                  } ${isCurrent ? "ring-2 ring-emerald-500/30" : ""}`}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div className="pb-5">
                    <p className={`text-[12px] font-bold ${isComplete ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {step.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isComplete ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Info cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="grid grid-cols-3 gap-2.5 w-full mb-6"
        >
          <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10 text-center">
            <Clock className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-[11px] font-bold">35–50m</p>
            <p className="text-[8px] text-muted-foreground">ETA</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
            <Shield className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-[11px] font-bold">Secure</p>
            <p className="text-[8px] text-muted-foreground">
              {order?.payment_provider === "paypal" ? "PayPal" : order?.payment_method === "aba" ? "ABA" : order?.payment_method === "cash" ? "Cash" : "Stripe"}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <Bell className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[11px] font-bold">Notified</p>
            <p className="text-[8px] text-muted-foreground">Updates</p>
          </div>
        </motion.div>

        {/* Delivery address */}
        {order?.delivery_address && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="w-full rounded-2xl bg-muted/10 border border-border/15 p-3.5 mb-6 flex items-start gap-2.5"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-foreground">{order.customer_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{order.delivery_address}</p>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="flex flex-col gap-2.5 w-full"
        >
          <Button
            onClick={() => navigate(`/grocery/track/${orderId}`)}
            className="w-full rounded-2xl h-12 font-bold gap-2"
          >
            <MapPin className="h-4 w-4" />
            Track My Order
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => navigate("/grocery")} className="flex-1 rounded-2xl h-11">
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Shop More
            </Button>
            <Button variant="outline" onClick={shareOrder} className="rounded-2xl h-11 px-4">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
