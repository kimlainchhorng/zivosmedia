/**
 * AdminShoppingOrders - Admin view to manage all shopping/grocery orders
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, RefreshCw, Package, MapPin, Clock, User,
  Phone, Truck, CheckCircle, XCircle, ShoppingCart, Image, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ShoppingOrder {
  id: string;
  store: string;
  status: string;
  items: any[];
  total_amount: number;
  delivery_fee: number;
  delivery_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  placed_at: string | null;
  driver_id: string | null;
  receipt_photo_url: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  accepted: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shopping: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  shopping_complete: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  picked_up: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  shopping: "Shopping",
  shopping_complete: "Shopped",
  picked_up: "Picked Up",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function AdminShoppingOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShoppingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from("shopping_orders")
      .select("id, store, status, items, total_amount, delivery_fee, delivery_address, customer_name, customer_phone, placed_at, driver_id, receipt_photo_url, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setOrders(
      (data || []).map((o) => ({
        ...o,
        items: Array.isArray(o.items) ? o.items : [],
      }))
    );
    setIsLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filters = ["all", "pending", "accepted", "shopping", "delivered", "cancelled"];

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="safe-area-top sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Shopping Orders</h1>
            <p className="text-xs text-muted-foreground">{orders.length} orders</p>
          </div>
          <button type="button"
            onClick={fetchOrders}
            className="p-2 rounded-xl hover:bg-muted"
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {filters.map((f) => (
            <button type="button"
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
              )}
            >
              {f === "all" ? "All" : STATUS_LABELS[f] || f}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No orders found</p>
        </div>
      )}

      {/* Orders List */}
      {!isLoading && (
        <div className="px-4 mt-4 space-y-3">
          {orders.map((order, i) => {
            const isExpanded = expandedId === order.id;
            const itemCount = order.items.reduce((s: number, it: any) => s + (it.quantity || 1), 0);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-border/50 bg-card overflow-hidden"
              >
                {/* Order Header */}
                <button type="button"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">
                        {order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm font-semibold mt-0.5">
                        {order.store} · {itemCount} items
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] border", STATUS_COLORS[order.status])}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {order.customer_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {order.customer_name}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">
                      ${order.total_amount.toFixed(2)}
                    </span>
                    {order.placed_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.placed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="border-t border-border/50 p-4 space-y-3"
                  >
                    {/* Delivery Info */}
                    {order.delivery_address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{order.delivery_address}</span>
                      </div>
                    )}
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{order.customer_phone}</span>
                      </div>
                    )}
                    {order.driver_id && (
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-mono">{order.driver_id.slice(0, 8)}</span>
                      </div>
                    )}

                    {/* Items */}
                    <div>
                      <p className="text-xs font-semibold mb-2">Items</p>
                      <div className="space-y-1.5">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs">
                            {item.image && (
                              <img src={item.image} alt="" className="h-8 w-8 rounded-lg object-contain bg-white border border-border/30" />
                            )}
                            <span className="flex-1 truncate">{item.quantity || 1}× {item.name}</span>
                            <span className="font-medium">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t border-border/30 pt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>${order.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Fee</span>
                        <span>${order.delivery_fee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-sm pt-1">
                        <span>Total</span>
                        <span>${(order.total_amount + order.delivery_fee).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Receipt Photo */}
                    {order.receipt_photo_url && (
                      <div>
                        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                          <Image className="h-3 w-3" /> Receipt
                        </p>
                        <button type="button" onClick={() => import("@/lib/openExternalUrl").then(({ openExternalUrl }) => openExternalUrl(order.receipt_photo_url))}>
                          <img
                            src={order.receipt_photo_url}
                            alt="Receipt"
                            className="h-32 w-auto rounded-xl border border-border/50 object-cover"
                          />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
