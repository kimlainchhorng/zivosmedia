/**
 * GroceryOrderTracker - Inline active order status widget
 * Shows on the store page when user has an active/recent order
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Truck, CheckCircle, ShoppingBag, Clock, ChevronRight, X, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActiveOrder {
  id: string;
  status: "pending" | "shopping" | "delivering" | "delivered";
  store: string;
  itemCount: number;
  total: number;
  placedAt: string;
}

const STATUS_CONFIG = {
  pending: { icon: Clock, label: "Order Placed", color: "text-blue-500", bg: "bg-blue-500/10", progress: 25 },
  shopping: { icon: ShoppingBag, label: "Driver Shopping", color: "text-amber-500", bg: "bg-amber-500/10", progress: 50 },
  delivering: { icon: Truck, label: "On the Way", color: "text-primary", bg: "bg-primary/10", progress: 75 },
  delivered: { icon: CheckCircle, label: "Delivered", color: "text-emerald-500", bg: "bg-emerald-500/10", progress: 100 },
};

function getActiveOrders(): ActiveOrder[] {
  try {
    const raw = localStorage.getItem("zivo_active_orders");
    if (raw) {
      const orders: ActiveOrder[] = JSON.parse(raw);
      // Only show orders from last 2 hours
      const cutoff = Date.now() - 2 * 60 * 60 * 1000;
      return orders.filter(o => new Date(o.placedAt).getTime() > cutoff && o.status !== "delivered");
    }
  } catch {}
  return [];
}

export function saveActiveOrder(order: ActiveOrder) {
  const orders = getActiveOrders();
  orders.unshift(order);
  localStorage.setItem("zivo_active_orders", JSON.stringify(orders.slice(0, 5)));
}

export function GroceryOrderTracker({ store }: { store: string }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOrders(getActiveOrders().filter(o => o.store.toLowerCase() === store.toLowerCase()));
  }, [store]);

  const visibleOrders = orders.filter(o => !dismissed.has(o.id));
  if (visibleOrders.length === 0) return null;

  return (
    <div className="px-4 mb-3 space-y-2">
      {visibleOrders.map((order) => {
        const cfg = STATUS_CONFIG[order.status];
        const Icon = cfg.icon;
        const elapsed = Math.round((Date.now() - new Date(order.placedAt).getTime()) / 60000);

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-muted/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${cfg.progress}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-primary rounded-r-full"
              />
            </div>

            <div className="p-3 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-foreground">{cfg.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} font-bold`}>
                    {elapsed}m ago
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {order.itemCount} items · ${order.total.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate(`/grocery/track/${order.id}`)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition-colors"
                >
                  Track
                  <ChevronRight className="h-3 w-3" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={() => setDismissed(prev => new Set(prev).add(order.id))}
                  className="p-1 rounded-lg hover:bg-muted/40"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
