/**
 * Lodging — Room Service / In-Room Dining Orders.
 * Track F&B orders per room through a placed → preparing → on_the_way → delivered pipeline.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  UtensilsCrossed, Plus, ChevronRight, CheckCircle2, Trash2,
  Clock, Truck, XCircle, ChefHat,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type OrderStatus = "placed" | "preparing" | "on_the_way" | "delivered" | "cancelled";

interface RoomServiceOrder {
  id: string;
  room_number: string;
  guest_name: string | null;
  items: string;
  notes: string | null;
  status: OrderStatus;
  runner_name: string | null;
  total_cents: number;
  created_at: string;
  delivered_at: string | null;
}

const STATUS_FLOW: OrderStatus[] = ["placed", "preparing", "on_the_way", "delivered"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  preparing: "Preparing",
  on_the_way: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  placed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  preparing: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  on_the_way: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const STATUS_ICON: Record<OrderStatus, any> = {
  placed: Clock,
  preparing: ChefHat,
  on_the_way: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const BLANK = { room_number: "", guest_name: "", items: "", notes: "", runner_name: "", total: "" };

export default function LodgingRoomServiceSection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "active" | "all">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const query = useQuery({
    queryKey: ["lodge_room_service_orders", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_room_service_orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RoomServiceOrder[];
    },
    refetchInterval: 30000,
  });

  const addOrder = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("lodge_room_service_orders").insert({
        store_id: storeId,
        room_number: form.room_number.trim(),
        guest_name: form.guest_name || null,
        items: form.items.trim(),
        notes: form.notes || null,
        runner_name: form.runner_name || null,
        total_cents: Math.round(parseFloat(form.total || "0") * 100),
        status: "placed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order placed");
      qc.invalidateQueries({ queryKey: ["lodge_room_service_orders", storeId] });
      setDialogOpen(false);
      setForm(BLANK);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const advanceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updates: any = { status };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      const { error } = await (supabase as any).from("lodge_room_service_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_room_service_orders", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const cancelOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_room_service_orders").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_room_service_orders", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_room_service_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_room_service_orders", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const activeOrders = all.filter(o => !["delivered", "cancelled"].includes(o.status));

  const filtered = all.filter(o => {
    if (filterStatus === "active") return !["delivered", "cancelled"].includes(o.status);
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  const todayRevenue = all
    .filter(o => o.status === "delivered" && o.created_at.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((s, o) => s + o.total_cents, 0);

  const isValid = form.room_number.trim() && form.items.trim();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><UtensilsCrossed className="h-5 w-5" /> Room Service</CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New order
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-roomservice" />
        <LodgingSectionStatusBanner
          title="Room Service"
          icon={UtensilsCrossed}
          countLabel="Active orders"
          countValue={activeOrders.length}
          fixLabel="Open Concierge"
          fixTab="lodge-concierge"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Active orders", value: activeOrders.length },
            { label: "Placed", value: all.filter(o => o.status === "placed").length },
            { label: "On the way", value: all.filter(o => o.status === "on_the_way").length },
            { label: "Today revenue", value: fmt(todayRevenue) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Status pipeline */}
        <div className="grid grid-cols-4 gap-1.5">
          {STATUS_FLOW.map(s => {
            const count = all.filter(o => o.status === s).length;
            const Icon = STATUS_ICON[s];
            return (
              <div key={s} className={`rounded-lg border p-2 text-center ${count > 0 ? STATUS_COLOR[s] : "border-border bg-muted/20 text-muted-foreground"}`}>
                <Icon className="h-4 w-4 mx-auto mb-1" />
                <p className="text-[10px] font-semibold">{STATUS_LABEL[s]}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(["active", "all", "placed", "preparing", "on_the_way", "delivered", "cancelled"] as const).map(s => (
            <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {s === "active" ? "Active" : s === "all" ? "All" : STATUS_LABEL[s as OrderStatus]}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "No room service orders yet. Use 'New order' to log an in-room dining request."
              : "No orders match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const Icon = STATUS_ICON[order.status];
              const nextIdx = STATUS_FLOW.indexOf(order.status);
              const nextStatus = nextIdx >= 0 && nextIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[nextIdx + 1] : null;
              return (
                <div key={order.id} className={`rounded-lg border p-3 ${["delivered", "cancelled"].includes(order.status) ? "opacity-70" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">Room {order.room_number}</span>
                        {order.guest_name && <span className="text-xs text-muted-foreground">— {order.guest_name}</span>}
                        <Badge className={`text-[10px] border ml-auto ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</Badge>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{order.items}</p>
                      {order.notes && <p className="text-[11px] text-muted-foreground mt-0.5 italic">{order.notes}</p>}
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        {order.total_cents > 0 && <span className="font-medium text-foreground">{fmt(order.total_cents)}</span>}
                        {order.runner_name && <span>Runner: {order.runner_name}</span>}
                        <span>{new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        {order.delivered_at && <span>✓ {new Date(order.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {nextStatus && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 gap-1"
                          onClick={() => advanceStatus.mutate({ id: order.id, status: nextStatus })}>
                          {STATUS_LABEL[nextStatus]} <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                      {!["delivered", "cancelled"].includes(order.status) && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          title="Cancel"
                          onClick={() => { if (confirm("Cancel this order?")) cancelOrder.mutate(order.id); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {["delivered", "cancelled"].includes(order.status) && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => { if (confirm("Delete this order?")) deleteOrder.mutate(order.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add order dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New room service order</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Room number *</Label>
                <Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. 203" />
              </div>
              <div>
                <Label>Guest name</Label>
                <Input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Items ordered *</Label>
                <Textarea rows={3} value={form.items} onChange={e => setForm({ ...form, items: e.target.value })}
                  placeholder="e.g. Club sandwich, Caesar salad, 2× still water, chocolate cake" />
              </div>
              <div>
                <Label>Total (USD)</Label>
                <Input type="number" min="0" step="0.01" value={form.total}
                  onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Assigned runner</Label>
                <Input value={form.runner_name} onChange={e => setForm({ ...form, runner_name: e.target.value })} placeholder="Staff name" />
              </div>
              <div className="sm:col-span-2">
                <Label>Special instructions</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. No onions, leave outside door" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || addOrder.isPending} onClick={() => addOrder.mutate()}>
                {addOrder.isPending ? "Placing…" : "Place order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
