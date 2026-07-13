import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Clock, CheckCircle, Truck, XCircle, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import AppLayout from "@/components/app/AppLayout";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending:    { label: "Pending",    icon: Clock,         color: "text-amber-500 bg-amber-500/10" },
  confirmed:  { label: "Confirmed",  icon: CheckCircle,   color: "text-blue-500 bg-blue-500/10" },
  picked_up:  { label: "Picked Up",  icon: Truck,         color: "text-purple-500 bg-purple-500/10" },
  delivered:  { label: "Delivered",  icon: CheckCircle,   color: "text-emerald-500 bg-emerald-500/10" },
  cancelled:  { label: "Cancelled",  icon: XCircle,       color: "text-destructive bg-destructive/10" },
};

export default function ShopOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: store } = useQuery({
    queryKey: ["my-store", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("store_profiles").select("id, name").eq("owner_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["shop-orders", store?.id, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("store_orders")
        .select("id, status, customer_name, customer_phone, total_cents, subtotal_cents, delivery_fee_cents, created_at, delivery_address, items")
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!store?.id,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("store_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-orders"] });
      toast.success("Order status updated");
    },
    onError: () => toast.error("Failed to update order"),
  });

  // Track IDs of orders that arrived after the page mounted (realtime "New" badge)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!store?.id) return;
    // Mark initial batch as seen once loaded
    if (!initialLoadDone.current && orders.length > 0) {
      initialLoadDone.current = true;
    }
    const channel = supabase
      .channel(`shop-orders-realtime-${store.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "store_orders",
        filter: `store_id=eq.${store.id}`,
      }, (payload) => {
        if (initialLoadDone.current) {
          setNewOrderIds(prev => new Set([...prev, payload.new.id]));
          toast("New order received!", { icon: "🛒" });
        }
        queryClient.invalidateQueries({ queryKey: ["shop-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [store?.id, orders.length, queryClient]);

  const filtered = orders.filter(o =>
    (o.customer_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  const statuses = ["all", "pending", "confirmed", "picked_up", "delivered", "cancelled"];

  return (
    <AppLayout>
      <div className="min-h-dvh bg-background pb-24">
        <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center gap-3 px-4 py-3">
            <button type="button" onClick={() => navigate("/shop-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-extrabold flex-1">Orders</h1>
            <Badge variant="secondary">{orders.filter(o => o.status === "pending").length} pending</Badge>
          </div>
          <div className="px-4 pb-2">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…" className="pl-9" />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {statuses.map(s => (
                <button type="button" key={s} onClick={() => setStatusFilter(s)}
                  className={cn("shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize",
                    s === statusFilter ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground")}>
                  {s === "all" ? "All" : (STATUS_CONFIG[s]?.label ?? s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-3">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16">
              <ShoppingBag className="h-14 w-14 text-muted-foreground/20 mx-auto mb-3" />
              <p className="font-semibold mb-1">No orders found</p>
              <p className="text-sm text-muted-foreground">Orders will appear here when customers place them.</p>
            </div>
          )}

          {filtered.map((order, i) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const nextStatus: Record<string, string> = {
              pending: "confirmed", confirmed: "picked_up", picked_up: "delivered",
            };
            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={cn("p-4 rounded-xl bg-card border space-y-3", newOrderIds.has(order.id) ? "border-primary/40 ring-1 ring-primary/20" : "border-border/40")}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm">{order.customer_name || "Customer"}</p>
                      {newOrderIds.has(order.id) && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold animate-pulse">NEW</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM d, h:mm a")}</p>
                  </div>
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold", cfg.color)}>
                    <StatusIcon className="h-3 w-3" />
                    {cfg.label}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{order.delivery_address || "Pickup"}</span>
                  <span className="font-bold">${(order.total_cents / 100).toFixed(2)}</span>
                </div>

                {nextStatus[order.status] && (
                  <Button size="sm" variant="outline" className="w-full rounded-xl text-xs"
                    onClick={() => updateStatus.mutate({ id: order.id, status: nextStatus[order.status] })}>
                    Mark as {STATUS_CONFIG[nextStatus[order.status]]?.label}
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
