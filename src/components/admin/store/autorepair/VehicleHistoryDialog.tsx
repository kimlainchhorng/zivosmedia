/**
 * Vehicle History — unified view of all activity tied to one customer vehicle.
 * Pulls work orders, estimates, invoices, inspections, notes, and reminders.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Car, Wrench, FileSignature, Receipt, ClipboardCheck, MessageSquareText, Bell,
} from "lucide-react";
import { format } from "date-fns";

type Vehicle = {
  id: string;
  owner_name: string;
  owner_phone?: string | null;
  owner_email?: string | null;
  year?: number | null;
  make: string;
  model: string;
  vin?: string | null;
  plate?: string | null;
  mileage?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  vehicle: Vehicle | null;
}

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_COLOR: Record<string, string> = {
  awaiting: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/15 text-blue-700",
  on_hold: "bg-amber-500/15 text-amber-700",
  qc: "bg-violet-500/15 text-violet-700",
  done: "bg-emerald-500/15 text-emerald-700",
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  declined: "bg-destructive/15 text-destructive",
  paid: "bg-emerald-500/15 text-emerald-700",
  unpaid: "bg-amber-500/15 text-amber-700",
  partial: "bg-amber-500/15 text-amber-700",
};

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "MMM d, yyyy"); } catch { return "—"; }
}

export default function VehicleHistoryDialog({ open, onOpenChange, storeId, vehicle }: Props) {
  const enabled = open && !!vehicle?.id;
  const vehicleLabel = vehicle ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") : "";

  const { data: workOrders = [] } = useQuery({
    queryKey: ["vehicle-history-wos", storeId, vehicle?.id, vehicleLabel],
    enabled,
    queryFn: async () => {
      let query = supabase.from("ar_work_orders" as any).select("*").eq("store_id", storeId);
      if (vehicle?.id) {
        query = query.or(`vehicle_id.eq.${vehicle.id},vehicle_label.eq.${vehicleLabel}`);
      } else {
        query = query.eq("vehicle_label", vehicleLabel);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["vehicle-history-estimates", storeId, vehicleLabel],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_estimates" as any)
        .select("*")
        .eq("store_id", storeId)
        .eq("vehicle_label", vehicleLabel)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["vehicle-history-invoices", storeId, vehicleLabel, vehicle?.vin],
    enabled,
    queryFn: async () => {
      let query = supabase.from("ar_invoices" as any).select("*").eq("store_id", storeId).is("deleted_at", null);
      if (vehicle?.vin) {
        query = query.or(`vin.eq.${vehicle.vin},vehicle_label.eq.${vehicleLabel}`);
      } else {
        query = query.eq("vehicle_label", vehicleLabel);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: inspections = [] } = useQuery({
    queryKey: ["vehicle-history-inspections", storeId, vehicleLabel, vehicle?.id],
    enabled,
    queryFn: async () => {
      let query = supabase.from("ar_inspections" as any).select("*").eq("store_id", storeId);
      if (vehicle?.id) {
        query = query.or(`customer_vehicle_id.eq.${vehicle.id},vehicle_label.eq.${vehicleLabel}`);
      } else {
        query = query.eq("vehicle_label", vehicleLabel);
      }
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["vehicle-history-notes", storeId, vehicle?.id],
    enabled,
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("ar_customer_notes" as any)
        .select("*")
        .eq("store_id", storeId)
        .eq("vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["vehicle-history-reminders", storeId, vehicle?.id],
    enabled,
    queryFn: async () => {
      if (!vehicle?.id) return [];
      const { data, error } = await supabase
        .from("ar_service_reminders" as any)
        .select("*")
        .eq("store_id", storeId)
        .eq("vehicle_id", vehicle.id)
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const totals = useMemo(() => {
    const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + (i.total_cents ?? 0), 0);
    const owed = invoices.reduce((s: number, i: any) => s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)), 0);
    return { paid, owed, woCount: workOrders.length, invCount: invoices.length };
  }, [workOrders, invoices]);

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Car className="w-4 h-4" />
            {vehicleLabel || "Vehicle"}
            {vehicle.plate && <Badge variant="outline" className="font-mono text-[10px]">{vehicle.plate}</Badge>}
          </DialogTitle>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
            <span>Owner: <span className="text-foreground">{vehicle.owner_name}</span></span>
            {vehicle.owner_phone && <span>{vehicle.owner_phone}</span>}
            {vehicle.vin && <span className="font-mono">VIN {vehicle.vin}</span>}
            {vehicle.mileage != null && <span>{vehicle.mileage.toLocaleString()} mi</span>}
          </div>
        </DialogHeader>

        <div className="px-5 py-3 border-b grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <Stat label="Work Orders" value={String(totals.woCount)} />
          <Stat label="Invoices" value={String(totals.invCount)} />
          <Stat label="Lifetime paid" value={fmt(totals.paid)} accent="text-emerald-600" />
          <Stat label="Outstanding" value={fmt(totals.owed)} accent={totals.owed > 0 ? "text-rose-600" : ""} />
        </div>

        <Tabs defaultValue="wos" className="flex-1 flex flex-col min-h-0">
          <TabsList className="px-5 mx-0 rounded-none border-b bg-transparent justify-start gap-1 shrink-0 h-auto py-1.5">
            <TabsTrigger value="wos" className="text-xs gap-1 h-7"><Wrench className="w-3 h-3" /> WOs ({workOrders.length})</TabsTrigger>
            <TabsTrigger value="ests" className="text-xs gap-1 h-7"><FileSignature className="w-3 h-3" /> Estimates ({estimates.length})</TabsTrigger>
            <TabsTrigger value="invs" className="text-xs gap-1 h-7"><Receipt className="w-3 h-3" /> Invoices ({invoices.length})</TabsTrigger>
            <TabsTrigger value="insp" className="text-xs gap-1 h-7"><ClipboardCheck className="w-3 h-3" /> Inspections ({inspections.length})</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs gap-1 h-7"><MessageSquareText className="w-3 h-3" /> Notes ({notes.length})</TabsTrigger>
            <TabsTrigger value="rems" className="text-xs gap-1 h-7"><Bell className="w-3 h-3" /> Reminders ({reminders.length})</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="wos" className="mt-0">
              {workOrders.length === 0 ? <Empty label="No work orders yet." /> : (
                <div className="space-y-2">
                  {workOrders.map((w: any) => (
                    <Card key={w.id}><CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{w.number} {w.is_comeback && <span className="text-destructive text-[10px]">COMEBACK</span>}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{w.notes || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(w.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={`text-[10px] ${STATUS_COLOR[w.status] || ""}`} variant="outline">{w.status.replace("_", " ")}</Badge>
                        {w.total_cents != null && <p className="text-sm font-semibold tabular-nums">{fmt(w.total_cents)}</p>}
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ests" className="mt-0">
              {estimates.length === 0 ? <Empty label="No estimates yet." /> : (
                <div className="space-y-2">
                  {estimates.map((e: any) => (
                    <Card key={e.id}><CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{e.number}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(e.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={`text-[10px] ${STATUS_COLOR[e.status] || ""}`} variant="outline">{e.status}</Badge>
                        <p className="text-sm font-semibold tabular-nums">{fmt(e.total_cents)}</p>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invs" className="mt-0">
              {invoices.length === 0 ? <Empty label="No invoices yet." /> : (
                <div className="space-y-2">
                  {invoices.map((i: any) => {
                    const balance = (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0);
                    return (
                      <Card key={i.id}><CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{i.number}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(i.created_at)}{i.paid_at ? ` · paid ${formatDate(i.paid_at)}` : ""}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge className={`text-[10px] ${STATUS_COLOR[i.status] || ""}`} variant="outline">{i.status}</Badge>
                          <p className="text-sm font-semibold tabular-nums">{fmt(i.total_cents)}</p>
                          {balance > 0 && <p className="text-[10px] text-rose-600">Balance {fmt(balance)}</p>}
                        </div>
                      </CardContent></Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="insp" className="mt-0">
              {inspections.length === 0 ? <Empty label="No inspections yet." /> : (
                <div className="space-y-2">
                  {inspections.map((i: any) => {
                    const cl = (i.checklist || {}) as Record<string, string>;
                    const counts = Object.values(cl).reduce((a: Record<string, number>, s) => { a[s] = (a[s] || 0) + 1; return a; }, {});
                    return (
                      <Card key={i.id}><CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{i.technician_name || "Inspection"}</p>
                          <div className="flex gap-2 text-[10px] mt-0.5">
                            <span className="text-emerald-600">● {counts.good || 0}</span>
                            <span className="text-amber-600">● {counts.attention || 0}</span>
                            <span className="text-red-600">● {counts.urgent || 0}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{formatDate(i.created_at)}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">{i.status.replace("_", " ")}</Badge>
                      </CardContent></Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              {notes.length === 0 ? <Empty label="No notes yet." /> : (
                <div className="space-y-2">
                  {notes.map((n: any) => (
                    <Card key={n.id}><CardContent className="p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{n.note_type}</Badge>
                        <p className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rems" className="mt-0">
              {reminders.length === 0 ? <Empty label="No reminders set up." /> : (
                <div className="space-y-2">
                  {reminders.map((r: any) => (
                    <Card key={r.id}><CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate capitalize">{r.reminder_type?.replace(/_/g, " ") || "Service"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Due {formatDate(r.due_at)}
                          {r.due_mileage ? ` · ${Number(r.due_mileage).toLocaleString()} mi` : ""}
                        </p>
                        {r.message && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{r.message}</p>}
                      </div>
                      {r.status && <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>}
                    </CardContent></Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-base font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground text-center py-10">{label}</p>;
}
