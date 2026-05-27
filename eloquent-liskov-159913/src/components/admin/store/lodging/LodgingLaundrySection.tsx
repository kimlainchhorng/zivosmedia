/**
 * Lodging — Laundry & Dry Cleaning.
 * Track laundry orders per room through collected → processing → ready → delivered pipeline.
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
  WashingMachine, Plus, ChevronRight, XCircle, Trash2,
  Package, Shirt, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type OrderStatus = "collected" | "processing" | "ready" | "delivered" | "cancelled";
type ServiceType = "standard" | "express" | "dry_cleaning" | "pressing" | "ironing";

interface LaundryOrder {
  id: string;
  room_number: string;
  guest_name: string | null;
  service_type: ServiceType;
  bag_count: number;
  items_desc: string | null;
  status: OrderStatus;
  total_cents: number;
  collected_at: string;
  ready_by: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_FLOW: OrderStatus[] = ["collected", "processing", "ready", "delivered"];

const STATUS_LABEL: Record<OrderStatus, string> = {
  collected: "Collected",
  processing: "Processing",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  collected: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  processing: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  ready: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const SERVICE_LABEL: Record<ServiceType, string> = {
  standard: "Standard Wash",
  express: "Express (4h)",
  dry_cleaning: "Dry Cleaning",
  pressing: "Pressing",
  ironing: "Ironing Only",
};

const SERVICE_ICON: Record<ServiceType, any> = {
  standard: WashingMachine,
  express: Sparkles,
  dry_cleaning: Shirt,
  pressing: Shirt,
  ironing: Shirt,
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const BLANK = {
  room_number: "", guest_name: "", service_type: "standard" as ServiceType,
  bag_count: "1", items_desc: "", total: "", ready_by: "", notes: "",
};

export default function LodgingLaundrySection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "active" | "all">("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(BLANK);

  const query = useQuery({
    queryKey: ["lodge_laundry_orders", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_laundry_orders")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LaundryOrder[];
    },
  });

  const addOrder = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("lodge_laundry_orders").insert({
        store_id: storeId,
        room_number: form.room_number.trim(),
        guest_name: form.guest_name || null,
        service_type: form.service_type,
        bag_count: parseInt(form.bag_count) || 1,
        items_desc: form.items_desc || null,
        total_cents: Math.round(parseFloat(form.total || "0") * 100),
        ready_by: form.ready_by || null,
        notes: form.notes || null,
        status: "collected",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laundry order added");
      qc.invalidateQueries({ queryKey: ["lodge_laundry_orders", storeId] });
      setDialogOpen(false);
      setForm(BLANK);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const advance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updates: any = { status };
      if (status === "delivered") updates.delivered_at = new Date().toISOString();
      const { error } = await (supabase as any).from("lodge_laundry_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_laundry_orders", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_laundry_orders").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge_laundry_orders", storeId] }),
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_laundry_orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_laundry_orders", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const active = all.filter(o => !["delivered", "cancelled"].includes(o.status));
  const filtered = all.filter(o => {
    if (filterStatus === "active") return !["delivered", "cancelled"].includes(o.status);
    if (filterStatus === "all") return true;
    return o.status === filterStatus;
  });

  const todayRevenue = all
    .filter(o => o.status === "delivered" && o.created_at.startsWith(new Date().toISOString().slice(0, 10)))
    .reduce((s, o) => s + o.total_cents, 0);

  const isValid = form.room_number.trim();

  // Check overdue (ready_by passed but not delivered)
  const today = new Date().toISOString().slice(0, 10);
  const overdue = active.filter(o => o.ready_by && o.ready_by < today && o.status !== "ready");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <WashingMachine className="h-5 w-5" /> Laundry & Dry Cleaning
        </CardTitle>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New order
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-laundry" />
        <LodgingSectionStatusBanner
          title="Laundry"
          icon={WashingMachine}
          countLabel="Active orders"
          countValue={active.length}
          fixLabel="Open Housekeeping"
          fixTab="lodge-housekeeping"
        />

        {/* Pipeline summary */}
        <div className="grid grid-cols-4 gap-1.5">
          {STATUS_FLOW.map(s => {
            const count = all.filter(o => o.status === s).length;
            return (
              <div key={s} className={`rounded-lg border p-2 text-center ${count > 0 ? STATUS_COLOR[s] : "border-border bg-muted/20 text-muted-foreground"}`}>
                <p className="text-[10px] font-semibold">{STATUS_LABEL[s]}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Active orders", value: active.length },
            { label: "Overdue", value: overdue.length },
            { label: "Today delivered", value: all.filter(o => o.status === "delivered" && o.created_at.startsWith(today)).length },
            { label: "Today revenue", value: fmt(todayRevenue) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {overdue.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 font-medium">
            ⚠ {overdue.length} order{overdue.length > 1 ? "s are" : " is"} past due date: {overdue.map(o => `Room ${o.room_number}`).join(", ")}
          </div>
        )}

        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {(["active", "all", "collected", "processing", "ready", "delivered", "cancelled"] as const).map(s => (
            <button type="button" key={s} onClick={() => setFilterStatus(s as any)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
              {s === "active" ? "Active" : s === "all" ? "All" : STATUS_LABEL[s as OrderStatus]}
            </button>
          ))}
        </div>

        {/* Orders */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0 ? "No laundry orders yet." : "No orders match this filter."}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(order => {
              const Icon = SERVICE_ICON[order.service_type];
              const nextIdx = STATUS_FLOW.indexOf(order.status);
              const nextStatus = nextIdx >= 0 && nextIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[nextIdx + 1] : null;
              const isOverdue = order.ready_by && order.ready_by < today && !["delivered", "cancelled"].includes(order.status);
              return (
                <div key={order.id} className={`rounded-lg border p-3 ${isOverdue ? "border-amber-500/30" : ""} ${["delivered", "cancelled"].includes(order.status) ? "opacity-70" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">Room {order.room_number}</span>
                        {order.guest_name && <span className="text-xs text-muted-foreground">— {order.guest_name}</span>}
                        <Badge variant="outline" className="text-[10px]">{SERVICE_LABEL[order.service_type]}</Badge>
                        <Badge className={`text-[10px] border ml-auto ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-2.5 w-2.5" />{order.bag_count} bag{order.bag_count > 1 ? "s" : ""}</span>
                        {order.total_cents > 0 && <span className="font-medium text-foreground">{fmt(order.total_cents)}</span>}
                        {order.ready_by && <span className={isOverdue ? "text-amber-600 font-medium" : ""}>Due: {order.ready_by}{isOverdue ? " ⚠" : ""}</span>}
                        {order.delivered_at && <span>Delivered: {new Date(order.delivered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                      {order.items_desc && <p className="text-[11px] text-muted-foreground mt-0.5">{order.items_desc}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {nextStatus && (
                        <Button size="sm" variant="outline" className="h-7 text-[11px] px-2 gap-1"
                          onClick={() => advance.mutate({ id: order.id, status: nextStatus })}>
                          {STATUS_LABEL[nextStatus]} <ChevronRight className="h-3 w-3" />
                        </Button>
                      )}
                      {!["delivered", "cancelled"].includes(order.status) && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                          onClick={() => { if (confirm("Cancel this order?")) cancel.mutate(order.id); }}>
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

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New laundry order</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Room number *</Label>
                <Input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. 203" />
              </div>
              <div>
                <Label>Guest name</Label>
                <Input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} />
              </div>
              <div>
                <Label>Service type</Label>
                <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v as ServiceType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SERVICE_LABEL) as ServiceType[]).map(k => (
                      <SelectItem key={k} value={k}>{SERVICE_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bags / pieces</Label>
                <Input type="number" min="1" value={form.bag_count} onChange={e => setForm({ ...form, bag_count: e.target.value })} />
              </div>
              <div>
                <Label>Charge (USD)</Label>
                <Input type="number" min="0" step="0.01" value={form.total}
                  onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Ready by</Label>
                <Input type="date" value={form.ready_by} onChange={e => setForm({ ...form, ready_by: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Items description</Label>
                <Textarea rows={2} value={form.items_desc} onChange={e => setForm({ ...form, items_desc: e.target.value })}
                  placeholder="e.g. 2 shirts, 1 suit, 3 socks" />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special care instructions" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || addOrder.isPending} onClick={() => addOrder.mutate()}>
                {addOrder.isPending ? "Saving…" : "Add order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
