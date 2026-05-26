/**
 * GroceryOrderPlaced - Premium order confirmation with animated stepper
 * Fetches real order data and shows live ETA
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle, ShoppingCart, ArrowLeft, Clock, Truck, Package,
  MapPin, Sparkles, ShoppingBag, ChevronRight, PartyPopper,
  Copy, Share2,
} from "lucide-react";
import { openShareToChat } from "@/components/chat/ShareToChatSheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { toast } from "sonner";

const STEPS = [
  { icon: CheckCircle, label: "Order Placed", desc: "We've received your order" },
  { icon: ShoppingBag, label: "Driver Assigned", desc: "A ZIVO driver will be matched shortly" },
  { icon: Package, label: "Shopping", desc: "Your driver will shop your items in-store" },
  { icon: Truck, label: "On the Way", desc: "Items will be delivered to your door" },
];

interface OrderData {
  store: string;
  total_amount: number;
  items: Array<{ name: string; quantity: number; image?: string }>;
  delivery_address: string;
  customer_name: string;
}

export default function GroceryOrderPlaced() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("id") || "";
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) { setLoading(false); return; }

    const fetchOrder = async () => {
      try {
        // Cash/ABA orders go into grocery_orders; card/PayPal/Square go into shopping_orders.
        // Try shopping_orders first, fall back to grocery_orders.
        const { data: shoppingData } = await supabase
          .from("shopping_orders")
          .select("store, total_amount, items, delivery_address, customer_name")
          .eq("id", orderId)
          .maybeSingle();

        if (shoppingData) {
          setOrder(shoppingData as unknown as OrderData);
        } else {
          const { data: groceryData } = await (supabase as any)
            .from("grocery_orders")
            .select("store, total_amount, items, delivery_address, customer_name")
            .eq("id", orderId)
            .maybeSingle();
          if (groceryData) setOrder(groceryData as OrderData);
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    toast.success("Order ID copied");
  };

  const itemCount = order?.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24 safe-area-top">
      <SEOHead
        title={order ? `Order from ${order.store} – ZIVO` : "Order Placed – ZIVO"}
        description="Your grocery order has been placed. Track your delivery in real time."
      />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-primary/8 blur-[80px]" />
        <div className="absolute bottom-1/3 -right-20 h-48 w-48 rounded-full bg-emerald-500/6 blur-[60px]" />
      </div>

      <div className="relative max-w-md mx-auto px-6 pt-12 flex flex-col items-center">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 150, delay: 0.1 }}
          className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-primary/10 flex items-center justify-center mb-6 ring-4 ring-emerald-500/10 shadow-2xl shadow-emerald-500/20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
          >
            <PartyPopper className="h-11 w-11 text-primary" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-extrabold mb-1 tracking-tight"
        >
          Order Placed! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[13px] text-muted-foreground text-center max-w-xs mb-6"
        >
          A ZIVO driver will shop your items in-store and deliver them to your door.
        </motion.p>

        {/* Order ID + real data */}
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
                <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/15">
                  <span className="text-[10px] font-bold text-primary">Processing</span>
                </div>
                {order?.total_amount != null && (
                  <span className="text-[13px] font-bold text-foreground">${order.total_amount.toFixed(2)}</span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Order items preview */}
        {loading ? (
          <div className="w-full space-y-2 mb-6">
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : order?.items && order.items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.48 }}
            className="w-full rounded-2xl bg-card border border-border/20 p-4 mb-6"
          >
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
              {itemCount} items ordered
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

        {/* Delivery address */}
        {order?.delivery_address && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full rounded-2xl bg-muted/10 border border-border/15 p-3.5 mb-4 flex items-start gap-2.5"
          >
            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-foreground">{order.customer_name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{order.delivery_address}</p>
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
            What's next
          </h3>
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const isActive = i === 0;
              const StepIcon = step.icon;
              return (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.08 }}
                  className="flex items-start gap-3.5 relative"
                >
                  {i < STEPS.length - 1 && (
                    <div className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] ${isActive ? "bg-primary" : "bg-border/30"}`} />
                  )}
                  <div className={`relative z-10 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-muted/30 text-muted-foreground/40 border border-border/20"
                  }`}>
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div className="pb-5">
                    <p className={`text-[12px] font-bold ${isActive ? "text-foreground" : "text-muted-foreground/50"}`}>
                      {step.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? "text-muted-foreground" : "text-muted-foreground/30"}`}>
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ETA + info cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex gap-3 w-full mb-6"
        >
          <div className="flex-1 p-3.5 rounded-2xl bg-primary/5 border border-primary/10 text-center">
            <Clock className="h-5 w-5 text-primary mx-auto mb-1.5" />
            <p className="text-[12px] font-bold text-foreground">35–50 min</p>
            <p className="text-[9px] text-muted-foreground">Est. delivery</p>
          </div>
          <div className="flex-1 p-3.5 rounded-2xl bg-muted/20 border border-border/15 text-center">
            <Truck className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-[12px] font-bold text-foreground">Live Tracking</p>
            <p className="text-[9px] text-muted-foreground">Updates soon</p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
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
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1 rounded-2xl h-11">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Home
            </Button>
            {order && (
              <Button variant="outline" onClick={() => openShareToChat({
                kind: "product",
                title: `Order from ${order.store}`,
                subtitle: `${itemCount} items`,
                meta: `$${order.total_amount.toFixed(2)} · Processing`,
                deepLink: `/grocery/track/${orderId}`,
                image: null,
              })} className="rounded-2xl h-11 px-4">
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
