/**
 * StoreOrdersSection — v2026 Enhanced order management
 * Real-time orders with status updates, filters, search, CSV export, receipts
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Clock, ImageIcon, CheckCircle2, Truck, Package,
  XCircle, Phone, MapPin, Loader2, AlertTriangle, User,
  Search, Download, RefreshCw, DollarSign, ShoppingBag, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

interface StoreOrder {
  id: string;
  store_id: string;
  customer_id: string;
  status: string;
  items: any[];
  delivery_address: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  payment_provider: string | null;
  receipt_url: string | null;
  receipt_uploaded_at: string | null;
  payment_confirmed_at: string | null;
  assigned_driver_id: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock; bgToken: string }> = {
  pending_payment: { label: "Pending Payment", color: "text-amber-600", icon: Clock, bgToken: "bg-amber-500/10" },
  receipt_uploaded: { label: "Receipt Uploaded", color: "text-blue-600", icon: ImageIcon, bgToken: "bg-blue-500/10" },
  payment_confirmed: { label: "Confirmed", color: "text-emerald-600", icon: CheckCircle2, bgToken: "bg-emerald-500/10" },
  assigned: { label: "Assigned", color: "text-purple-600", icon: Truck, bgToken: "bg-purple-500/10" },
  picked_up: { label: "Picked Up", color: "text-indigo-600", icon: Package, bgToken: "bg-indigo-500/10" },
  delivered: { label: "Delivered", color: "text-emerald-600", icon: CheckCircle2, bgToken: "bg-emerald-500/10" },
  cancelled: { label: "Cancelled", color: "text-destructive", icon: XCircle, bgToken: "bg-destructive/10" },
};

export default function StoreOrdersSection({ storeId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortNewest, setSortNewest] = useState(true);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["store-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StoreOrder[];
    },
    enabled: !!storeId,
    refetchInterval: 15000,
  });

  const confirmPayment = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("store_orders")
        .update({ status: "payment_confirmed", payment_confirmed_at: new Date().toISOString(), confirmed_by: user?.id })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders", storeId] });
      toast.success("Payment confirmed!");
      setSelectedOrder(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("store_orders")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: "Payment not verified" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders", storeId] });
      toast.success("Order rejected.");
      setSelectedOrder(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const assignToDriver = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("store_orders").update({ status: "assigned" }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders", storeId] });
      toast.success("Order sent to driver!");
      setSelectedOrder(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markDelivered = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("store_orders")
        .update({ status: "delivered", delivered_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-orders", storeId] });
      toast.success("Order marked as delivered!");
      setSelectedOrder(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Filters
  const pendingOrders = orders.filter(o => ["pending_payment", "receipt_uploaded"].includes(o.status));
  const confirmedOrders = orders.filter(o => ["payment_confirmed", "assigned", "picked_up"].includes(o.status));
  const completedOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  const filteredOrders = useMemo(() => {
    let list: StoreOrder[];
    switch (activeFilter) {
      case "pending": list = pendingOrders; break;
      case "active": list = confirmedOrders; break;
      case "completed": list = completedOrders; break;
      default: list = orders;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.customer_name || "").toLowerCase().includes(q) ||
          (o.customer_phone || "").includes(q)
      );
    }
    if (!sortNewest) list = [...list].reverse();
    return list;
  }, [orders, activeFilter, searchQuery, sortNewest]);

  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.total_cents, 0);

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const exportCSV = () => {
    const headers = ["Order ID", "Customer", "Status", "Items", "Total", "Date"];
    const rows = orders.map((o) => [
      o.id.slice(0, 8),
      o.customer_name || "N/A",
      STATUS_CONFIG[o.status]?.label || o.status,
      (o.items as any[]).length,
      (o.total_cents / 100).toFixed(2),
      format(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Orders exported!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Revenue Banner */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-black text-primary">{formatCents(totalRevenue)}</p>
              <p className="text-[10px] text-muted-foreground">Total Revenue (Delivered)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" aria-label="Refresh orders" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} className="rounded-xl text-xs gap-1">
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: orders.length, color: "text-foreground" },
          { label: "Pending", value: pendingOrders.length, color: "text-amber-500" },
          { label: "Active", value: confirmedOrders.length, color: "text-primary" },
          { label: "Done", value: completedOrders.length, color: "text-muted-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-border/30">
            <CardContent className="p-2.5 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders..."
            className="pl-9 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortNewest(!sortNewest)}
          className="rounded-xl shrink-0"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 gap-1 text-xs">
            <Clock className="w-3 h-3" /> Pending {pendingOrders.length > 0 && `(${pendingOrders.length})`}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1 gap-1 text-xs">
            <Truck className="w-3 h-3" /> Active {confirmedOrders.length > 0 && `(${confirmedOrders.length})`}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" /> Done
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Order List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No {activeFilter} orders</p>
                <p className="text-xs mt-1">Orders will appear here when customers place them</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order, idx) => {
              const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending_payment;
              const StatusIcon = config.icon;
              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card
                    className="cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all active:scale-[0.98]"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`h-9 w-9 rounded-xl ${config.bgToken} flex items-center justify-center shrink-0 mt-0.5`}>
                            <StatusIcon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${config.bgToken} ${config.color} border-0`}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {order.customer_name || "Customer"} · {(order.items as any[]).length} item{(order.items as any[]).length !== 1 ? "s" : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(order.created_at), "MMM d, h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{formatCents(order.total_cents)}</p>
                          {order.status === "receipt_uploaded" && (
                            <Badge variant="destructive" className="text-[9px] mt-1 animate-pulse">
                              Review
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  <Badge variant="secondary" className={`text-[10px] ${STATUS_CONFIG[selectedOrder.status]?.bgToken} ${STATUS_CONFIG[selectedOrder.status]?.color} border-0`}>
                    {STATUS_CONFIG[selectedOrder.status]?.label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="rounded-2xl border border-border/40 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer</p>
                  {selectedOrder.customer_name && (
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" /> {selectedOrder.customer_name}
                    </p>
                  )}
                  {selectedOrder.customer_phone && (
                    <a href={`tel:${selectedOrder.customer_phone}`} className="text-sm flex items-center gap-2 text-primary">
                      <Phone className="w-4 h-4" /> {selectedOrder.customer_phone}
                    </a>
                  )}
                  {selectedOrder.delivery_address && (
                    <p className="text-xs flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" /> {selectedOrder.delivery_address}
                    </p>
                  )}
                </div>

                {/* Items */}
                <div className="rounded-2xl border border-border/40 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Items</p>
                  {(selectedOrder.items as any[]).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span><span className="font-semibold">{item.quantity}x</span> {item.name}</span>
                      <span className="text-muted-foreground">{formatCents(item.price_cents * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal</span><span>{formatCents(selectedOrder.subtotal_cents)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Delivery</span><span>{formatCents(selectedOrder.delivery_fee_cents)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold pt-1">
                      <span>Total</span><span>{formatCents(selectedOrder.total_cents)}</span>
                    </div>
                  </div>
                </div>

                {/* Receipt */}
                {selectedOrder.receipt_url && (
                  <div className="rounded-2xl border border-border/40 p-3 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment Receipt</p>
                    {selectedOrder.payment_provider && (
                      <Badge variant="outline" className="text-[10px]">
                        {selectedOrder.payment_provider.toUpperCase()}
                      </Badge>
                    )}
	                    <img
	                      src={selectedOrder.receipt_url}
	                      alt="Payment receipt"
	                      className="w-full rounded-xl border border-border/30 cursor-pointer hover:opacity-90 transition-opacity"
	                      loading="lazy"
	                      decoding="async"
	                      onClick={() => setReceiptPreview(selectedOrder.receipt_url)}
	                    />
                    {selectedOrder.receipt_uploaded_at && (
                      <p className="text-[10px] text-muted-foreground">
                        Uploaded {format(new Date(selectedOrder.receipt_uploaded_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                )}

                {!selectedOrder.receipt_url && selectedOrder.status === "pending_payment" && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Customer hasn't uploaded payment receipt yet.</p>
                  </div>
                )}

                {/* Actions */}
                {selectedOrder.status === "receipt_uploaded" && (
                  <div className="flex gap-2">
                    <Button className="flex-1 gap-1.5 rounded-xl" onClick={() => confirmPayment.mutate(selectedOrder.id)} disabled={confirmPayment.isPending}>
                      {confirmPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Confirm Payment
                    </Button>
                    <Button variant="destructive" className="gap-1.5 rounded-xl" onClick={() => rejectOrder.mutate(selectedOrder.id)} disabled={rejectOrder.isPending}>
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                )}

                {selectedOrder.status === "payment_confirmed" && (
                  <Button className="w-full gap-1.5 rounded-xl" onClick={() => assignToDriver.mutate(selectedOrder.id)} disabled={assignToDriver.isPending}>
                    {assignToDriver.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                    Send to Driver
                  </Button>
                )}

                {(selectedOrder.status === "assigned" || selectedOrder.status === "picked_up") && (
                  <Button className="w-full gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => markDelivered.mutate(selectedOrder.id)} disabled={markDelivered.isPending}>
                    {markDelivered.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark as Delivered
                  </Button>
                )}

                {selectedOrder.payment_confirmed_at && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Payment confirmed {format(new Date(selectedOrder.payment_confirmed_at), "MMM d, h:mm a")}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Fullscreen */}
      <Dialog open={!!receiptPreview} onOpenChange={() => setReceiptPreview(null)}>
        <DialogContent className="max-w-2xl p-2">
	          {receiptPreview && (
	            <img
	              src={receiptPreview}
	              alt="Receipt"
	              className="w-full rounded-xl"
	              loading="eager"
	              decoding="async"
	            />
	          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
