/**
 * DriverOrdersPage - Dashboard for drivers to see available and assigned shopping orders
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Package, MapPin, Clock, ShoppingCart,
  ChevronRight, Loader2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDriverShoppingOrders } from "@/hooks/useDriverShoppingOrders";
import type { ShoppingOrder } from "@/hooks/useDriverShoppingOrders";
import { toast } from "sonner";
import { useEatsNotifications } from "@/hooks/useEatsNotifications";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function OrderCard({
  order,
  onAccept,
  onTap,
  isAccepting,
  showAccept,
  onAdvance,
  isAdvancing,
}: {
  order: ShoppingOrder;
  onAccept?: () => void;
  onTap: () => void;
  isAccepting?: boolean;
  showAccept?: boolean;
  onAdvance?: () => void;
  isAdvancing?: boolean;
}) {
  const itemCount = Array.isArray(order.items) ? order.items.length : 0;
  const timeAgo = order.placed_at
    ? formatDistanceToNow(new Date(order.placed_at), { addSuffix: true })
    : "";

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    accepted: "bg-blue-500/10 text-blue-600",
    shopping: "bg-purple-500/10 text-purple-600",
    shopping_complete: "bg-emerald-500/10 text-emerald-600",
    picked_up: "bg-primary/10 text-primary",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all cursor-pointer"
      onClick={onTap}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold">{order.store}</p>
            <p className="text-[11px] text-muted-foreground">{order.id.slice(0, 8)}</p>
          </div>
        </div>
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusColors[order.status] || "bg-muted text-muted-foreground")}>
          {order.status.replace("_", " ")}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          <span>{itemCount} items</span>
          <span className="mx-1">•</span>
          <span className="font-semibold text-foreground">${order.total_amount?.toFixed(2)}</span>
        </div>
        {order.delivery_address && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="line-clamp-1">{order.delivery_address}</span>
          </div>
        )}
        {timeAgo && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeAgo}</span>
          </div>
        )}
      </div>

      {showAccept ? (
        <Button
          size="sm"
          className="w-full rounded-xl"
          onClick={(e) => { e.stopPropagation(); onAccept?.(); }}
          disabled={isAccepting}
        >
          {isAccepting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Accept Order
        </Button>
      ) : (
        <div className="space-y-2">
          {STATUS_ADVANCE[order.status] && (
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onAdvance?.(); }}
              disabled={isAdvancing}
              className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold touch-manipulation active:scale-[0.98] transition-all disabled:opacity-50">
              {isAdvancing ? "Updating…" : STATUS_ADVANCE_LABEL[order.status]}
            </button>
          )}
          <div className="flex items-center justify-end text-xs text-primary font-medium">
            View details <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </div>
        </div>
      )}
    </motion.div>
  );
}

const STATUS_ADVANCE: Record<string, string> = {
  accepted: "shopping",
  shopping: "shopping_complete",
  shopping_complete: "picked_up",
};
const STATUS_ADVANCE_LABEL: Record<string, string> = {
  accepted: "Start Shopping →",
  shopping: "Shopping Done →",
  shopping_complete: "Picked Up →",
};

export default function DriverOrdersPage() {
  const navigate = useNavigate();
  const { notify: notifyEats } = useEatsNotifications();
  const { available, assigned, isLoading, acceptOrder, refetch } = useDriverShoppingOrders();
  const handlePullRefresh = useCallback(async () => { await refetch(); }, [refetch]);
  const [tab, setTab] = useState<"available" | "my">("available");
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  const handleAdvance = async (orderId: string, currentStatus: string) => {
    const next = STATUS_ADVANCE[currentStatus];
    if (!next) return;
    setAdvancingId(orderId);
    const { error } = await (supabase as any).from("shopping_orders").update({ status: next }).eq("id", orderId);
    setAdvancingId(null);
    if (error) {
      toast.error("Could not update status.");
      return;
    }
    await refetch();
    toast.success(`Status: ${next.replace(/_/g, " ")}`);
  };

  const handleAccept = async (orderId: string) => {
    setAcceptingId(orderId);
    const ok = await acceptOrder(orderId);
    setAcceptingId(null);
    if (ok) {
      notifyEats("new_delivery_driver", { orderId });
      setTab("my");
    } else {
      toast.error("Could not accept — it may have been taken.");
    }
  };

  const orders = tab === "available" ? available : assigned;

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">Shopping Orders</h1>
          <button type="button" onClick={refetch} className="p-1.5 rounded-xl hover:bg-muted" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="available" className="flex-1 text-xs">
                Available ({available.length})
              </TabsTrigger>
              <TabsTrigger value="my" className="flex-1 text-xs">
                My Orders ({assigned.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === "available"
                ? "No orders available right now. Pull down to refresh."
                : "No active orders. Accept one to get started!"}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                showAccept={tab === "available"}
                isAccepting={acceptingId === order.id}
                onAccept={() => handleAccept(order.id)}
                onTap={() => navigate(`/driver/shopping/${order.id}`)}
                onAdvance={() => handleAdvance(order.id, order.status)}
                isAdvancing={advancingId === order.id}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </PullToRefresh>
  );
}
