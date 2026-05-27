/**
 * Admin Flight Orders - View and manage customer flight bookings
 */
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Plane, RefreshCw, Eye, Download,
  CheckCircle, XCircle, Ban, DollarSign, TrendingUp, Banknote
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type FlightBooking = {
  id: string;
  customer_id: string;
  booking_reference: string;
  status: string | null;
  payment_status: string | null;
  ticketing_status: string | null;
  total_amount: number;
  currency: string | null;
  origin: string | null;
  destination: string | null;
  departure_date: string | null;
  return_date: string | null;
  cabin_class: string;
  total_passengers: number;
  pnr: string | null;
  created_at: string;
  passengers: any;
  stripe_payment_intent_id: string | null;
  ticketing_partner_order_id: string | null;
  zivo_markup: number | null;
  duffel_cost: number | null;
  refund_status: string | null;
  refund_amount: number | null;
  admin_notes: string | null;
  dispute_status: string | null;
  special_requests: string | null;
  offer_id: string | null;
  // joined
  customer_email?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  issued: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  ticketed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-muted text-muted-foreground",
};

const VALID_STATUSES = ["pending", "confirmed", "issued", "ticketed", "processing", "failed", "cancelled"] as const;

export default function AdminFlightOrders() {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<FlightBooking | null>(null);
  const queryClient = useQueryClient();

  // Fetch bookings + customer emails via profiles join
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["admin-flight-bookings"],
    queryFn: async () => {
      // Get bookings
      const { data: bookings, error } = await supabase
        .from("flight_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (bookings || []) as unknown as FlightBooking[];

      // Get customer emails from profiles
      const customerIds = [...new Set(rows.map((r) => r.customer_id))];
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", customerIds);
        const emailMap = new Map((profiles || []).map((p: any) => [p.user_id, p.email]));
        rows.forEach((r) => {
          r.customer_email = emailMap.get(r.customer_id) || null;
        });
      }

      return rows;
    },
  });

  // Status update mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("flight_bookings")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-flight-bookings"] });
      setSelectedOrder(null);
    },
    onError: (err: any) => toast.error(err?.message || "Failed to update status"),
  });

  const filtered = useMemo(() => {
    if (!orders) return [];
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) =>
      o.id?.toLowerCase().includes(q) ||
      o.booking_reference?.toLowerCase().includes(q) ||
      o.pnr?.toLowerCase().includes(q) ||
      o.origin?.toLowerCase().includes(q) ||
      o.destination?.toLowerCase().includes(q) ||
      o.status?.toLowerCase().includes(q) ||
      o.customer_email?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  // Revenue stats
  const stats = useMemo(() => {
    if (!orders) return { total: 0, revenue: 0, markup: 0, duffelCost: 0 };
    return {
      total: orders.length,
      revenue: orders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
      markup: orders.reduce((s, o) => s + Number(o.zivo_markup || 0), 0),
      duffelCost: orders.reduce((s, o) => s + Number(o.duffel_cost || 0), 0),
    };
  }, [orders]);

  // CSV export
  const handleExport = useCallback(() => {
    if (!filtered?.length) return;
    const headers = ["Date", "Route", "Booking Ref", "Customer Email", "Status", "Payment", "Amount", "Passengers", "PNR", "ZIVO Markup", "Duffel Cost"];
    const csvRows = [headers.join(",")];
    filtered.forEach((o) => {
      csvRows.push([
        format(new Date(o.created_at), "yyyy-MM-dd"),
        `${o.origin || ""}→${o.destination || ""}`,
        o.booking_reference,
        o.customer_email || "",
        o.status || "",
        o.payment_status || "",
        Number(o.total_amount || 0).toFixed(2),
        o.total_passengers,
        o.pnr || "",
        Number(o.zivo_markup || 0).toFixed(2),
        Number(o.duffel_cost || 0).toFixed(2),
      ].join(","));
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flight-orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  }, [filtered]);

  return (
    <AdminLayout title="Flight Orders">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, booking ref, route, PNR…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2" onClick={handleExport} disabled={!filtered?.length}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600" },
          { label: "ZIVO Markup", value: `$${stats.markup.toFixed(2)}`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Duffel Cost", value: `$${stats.duffelCost.toFixed(2)}`, icon: Banknote, color: "text-orange-600" },
          { label: "Total Bookings", value: String(stats.total), icon: Plane, color: "text-purple-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Status counts */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Confirmed", value: orders?.filter((o) => ["confirmed", "issued", "ticketed"].includes(o.status || "")).length || 0 },
          { label: "Pending", value: orders?.filter((o) => ["pending", "processing"].includes(o.status || "")).length || 0 },
          { label: "Failed / Cancelled", value: orders?.filter((o) => ["failed", "cancelled"].includes(o.status || "")).length || 0 },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading flight orders…</div>
      ) : !filtered?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Plane className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No flight orders found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Route</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ref</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Pax</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-foreground">
                    {format(new Date(order.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-foreground truncate max-w-[180px]" title={order.customer_email || undefined}>
                    {order.customer_email || <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium whitespace-nowrap">
                    {order.origin && order.destination ? `${order.origin} → ${order.destination}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                    {order.booking_reference}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className={STATUS_COLORS[order.status || ""] || "bg-muted text-muted-foreground"}>
                      {order.status || "unknown"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">
                      {order.payment_status || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    ${Number(order.total_amount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center text-muted-foreground">
                    {order.total_passengers}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button aria-label="Open order" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(order)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-3 text-sm">
              <Row label="Booking Ref" value={selectedOrder.booking_reference} />
              <Row label="Customer" value={selectedOrder.customer_email || "—"} />
              <Row label="Route" value={`${selectedOrder.origin || "?"} → ${selectedOrder.destination || "?"}`} />
              <Row label="Departure" value={selectedOrder.departure_date || "—"} />
              {selectedOrder.return_date && <Row label="Return" value={selectedOrder.return_date} />}
              <Row label="Cabin" value={selectedOrder.cabin_class} />
              <Row label="Passengers" value={String(selectedOrder.total_passengers)} />
              <Row label="Payment" value={selectedOrder.payment_status || "—"} />
              <Row label="Ticketing" value={selectedOrder.ticketing_status || "—"} />
              <Row label="PNR" value={selectedOrder.pnr || "—"} />
              <Row label="Total" value={`$${Number(selectedOrder.total_amount).toFixed(2)} ${(selectedOrder.currency || "USD").toUpperCase()}`} />
              {selectedOrder.zivo_markup != null && <Row label="ZIVO Markup" value={`$${Number(selectedOrder.zivo_markup).toFixed(2)}`} />}
              {selectedOrder.duffel_cost != null && <Row label="Duffel Cost" value={`$${Number(selectedOrder.duffel_cost).toFixed(2)}`} />}
              <Row label="Stripe PI" value={selectedOrder.stripe_payment_intent_id || "—"} />
              <Row label="Partner Order" value={selectedOrder.ticketing_partner_order_id || "—"} />
              {selectedOrder.refund_status && <Row label="Refund" value={`${selectedOrder.refund_status} ($${Number(selectedOrder.refund_amount || 0).toFixed(2)})`} />}
              {selectedOrder.dispute_status && <Row label="Dispute" value={selectedOrder.dispute_status} />}
              {selectedOrder.special_requests && <Row label="Special Requests" value={selectedOrder.special_requests} />}
              {selectedOrder.admin_notes && <Row label="Admin Notes" value={selectedOrder.admin_notes} />}
              <Row label="Created" value={format(new Date(selectedOrder.created_at), "PPpp")} />

              {/* Status update */}
              <div className="border-t border-border pt-3 mt-3">
                <p className="font-medium text-foreground mb-2">Update Status</p>
                <div className="flex gap-2">
                  <Select
                    defaultValue={selectedOrder.status || "pending"}
                    onValueChange={(val) => statusMutation.mutate({ id: selectedOrder.id, status: val })}
                    disabled={statusMutation.isPending}
                  >
                    <SelectTrigger className="h-9 rounded-lg flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm" variant="outline" className="gap-1.5 rounded-lg text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: "confirmed" })}
                  disabled={statusMutation.isPending || selectedOrder.status === "confirmed"}
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm
                </Button>
                <Button
                  size="sm" variant="outline" className="gap-1.5 rounded-lg text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: "cancelled" })}
                  disabled={statusMutation.isPending || selectedOrder.status === "cancelled"}
                >
                  <Ban className="w-3.5 h-3.5" /> Cancel
                </Button>
                <Button
                  size="sm" variant="outline" className="gap-1.5 rounded-lg text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={() => statusMutation.mutate({ id: selectedOrder.id, status: "failed" })}
                  disabled={statusMutation.isPending || selectedOrder.status === "failed"}
                >
                  <XCircle className="w-3.5 h-3.5" /> Mark Failed
                </Button>
              </div>

              {selectedOrder.passengers && (
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Passengers</p>
                  <pre className="bg-muted rounded-lg p-3 text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedOrder.passengers, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right font-medium break-all">{value}</span>
    </div>
  );
}
