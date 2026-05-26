/**
 * Auto Repair — Work Orders
 * List + Kanban, tech assignment, edit, KPI strip, Convert to Invoice.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Hammer, Plus, Search, LayoutGrid, List, Trash2, AlertOctagon,
  User, Pencil, Receipt, Timer, CheckCheck, Link2, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import LaborGuidePickerDialog from "./LaborGuidePickerDialog";
import type { LaborGuideEntry } from "@/lib/laborGuide";

interface Props { storeId: string }

const COLS = [
  { id: "awaiting",    label: "Awaiting"    },
  { id: "in_progress", label: "In Progress" },
  { id: "on_hold",     label: "On Hold"     },
  { id: "qc",         label: "QC"          },
  { id: "done",       label: "Done"        },
] as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  awaiting: "outline", in_progress: "secondary", on_hold: "destructive", qc: "secondary", done: "default",
};

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const blankForm = {
  number: "", customer_name: "", customer_phone: "", customer_email: "",
  vehicle_label: "", notes: "", labor_hours: "", total_cents_str: "", is_comeback: false,
};

export default function AutoRepairWorkOrdersSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [guideOpen, setGuideOpen] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["ar-work-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_work_orders" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: techs = [] } = useQuery({
    queryKey: ["ar-technicians", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_technicians" as any).select("id,name").eq("store_id", storeId).eq("active", true);
      if (error) throw error;
      return data as any[];
    },
  });

  const kpi = useMemo(() => ({
    total: orders.length,
    open: orders.filter((o: any) => !["done", "on_hold"].includes(o.status)).length,
    done: orders.filter((o: any) => o.status === "done").length,
    comebacks: orders.filter((o: any) => o.is_comeback).length,
  }), [orders]);

  const techMap = useMemo(() => {
    const m: Record<string, string> = {};
    techs.forEach((t: any) => { m[t.id] = t.name; });
    return m;
  }, [techs]);

  const filtered = useMemo(() => orders.filter((o: any) =>
    !q || `${o.number} ${o.customer_name ?? ""} ${o.vehicle_label ?? ""} ${o.notes ?? ""}`
      .toLowerCase().includes(q.toLowerCase())
  ), [orders, q]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { awaiting: [], in_progress: [], on_hold: [], qc: [], done: [] };
    filtered.forEach((o: any) => g[o.status]?.push(o));
    return g;
  }, [filtered]);

  const resetForm = () => { setForm(blankForm); setEditId(null); };

  const openNew = () => { resetForm(); setOpen(true); };
  const openEdit = (o: any) => {
    setEditId(o.id);
    setForm({
      number: o.number ?? "",
      customer_name: o.customer_name ?? "",
      customer_phone: o.customer_phone ?? "",
      customer_email: o.customer_email ?? "",
      vehicle_label: o.vehicle_label ?? "",
      notes: o.notes ?? "",
      labor_hours: o.labor_hours != null ? String(o.labor_hours) : "",
      total_cents_str: o.total_cents != null ? String(o.total_cents / 100) : "",
      is_comeback: !!o.is_comeback,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        store_id: storeId,
        number: form.number || `WO-${Date.now().toString().slice(-6)}`,
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        vehicle_label: form.vehicle_label || null,
        notes: form.notes || null,
        labor_hours: form.labor_hours ? parseFloat(form.labor_hours) : null,
        total_cents: form.total_cents_str ? Math.round(parseFloat(form.total_cents_str) * 100) : null,
        is_comeback: form.is_comeback,
      };
      if (editId) {
        const { error } = await supabase.from("ar_work_orders" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        payload.status = "awaiting";
        const { error } = await supabase.from("ar_work_orders" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Work order updated" : "Work order created");
      qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("ar_work_orders" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_work_orders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Work order deleted");
      qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const convertToInvoice = useMutation({
    mutationFn: async (o: any) => {
      const laborItem = o.labor_hours
        ? [{ category: "labor", description: "Labor", hours: o.labor_hours, price: o.total_cents ? ((o.total_cents / 100) / o.labor_hours) : 0 }]
        : [];
      const partsItems = Array.isArray(o.parts_used)
        ? o.parts_used.map((p: any) => ({ category: "part", description: p.name || "Part", qty: p.qty ?? 1, price: p.unit_cents ? p.unit_cents / 100 : 0 }))
        : [];
      const items = [...laborItem, ...partsItems];

      const { error } = await supabase.from("ar_invoices" as any).insert({
        store_id: storeId,
        number: `INV-${Date.now().toString().slice(-6)}`,
        status: "draft",
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        customer_email: o.customer_email,
        vehicle_label: o.vehicle_label,
        items,
        total_cents: o.total_cents ?? 0,
        amount_paid_cents: 0,
        source_workorder_id: o.id,
      });
      if (error) throw error;
      await supabase.from("ar_work_orders" as any)
        .update({ status: "done", converted_invoice: true }).eq("id", o.id);
    },
    onSuccess: () => {
      toast.success("Converted to Invoice — check the Invoices tab");
      qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-invoices", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Conversion failed"),
  });

  const shareStatus = async (o: any) => {
    const token = o.share_token || crypto.randomUUID();
    if (!o.share_token) {
      const { error } = await supabase
        .from("ar_work_orders" as any)
        .update({ share_token: token })
        .eq("id", o.id);
      if (error) { toast.error(error.message); return; }
      qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
    }
    const url = `${window.location.origin}/repair/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Status link copied — send it to your customer", { duration: 4000 });
  };

  const WOCard = ({ o }: { o: any }) => (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/40 transition gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-semibold text-sm">{o.number}</span>
          <Badge variant={STATUS_VARIANT[o.status] ?? "outline"} className="text-[10px] capitalize">
            {o.status?.replace("_", " ")}
          </Badge>
          {o.is_comeback && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertOctagon className="w-3 h-3" /> Comeback
            </Badge>
          )}
          {o.converted_invoice && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Receipt className="w-3 h-3" /> Invoiced
            </Badge>
          )}
          {o.technician_id && techMap[o.technician_id] && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <User className="w-3 h-3" /> {techMap[o.technician_id]}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {o.customer_name || "No customer"}
          {o.vehicle_label ? ` · ${o.vehicle_label}` : ""}
          {o.labor_hours ? ` · ${o.labor_hours}h` : ""}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-sm tabular-nums">{fmt(o.total_cents ?? 0)}</p>
        <div className="flex gap-1 mt-1 justify-end flex-wrap">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => openEdit(o)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" title="Copy customer status link" onClick={() => shareStatus(o)}>
            <Link2 className="w-3.5 h-3.5" />
          </Button>
          {!o.converted_invoice && o.status === "done" && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Convert to Invoice"
              onClick={() => convertToInvoice.mutate(o)}>
              <Receipt className="w-3.5 h-3.5" />
            </Button>
          )}
          {o.status !== "done" && (
            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" title="Mark Done"
              onClick={() => update.mutate({ id: o.id, patch: { status: "done", completed_at: new Date().toISOString() } })}>
              <CheckCheck className="w-3.5 h-3.5" />
            </Button>
          )}
          <Select value={o.status}
            onValueChange={(v) => update.mutate({ id: o.id, patch: { status: v } })}>
            <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLS.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={o.technician_id ?? "_unassigned"}
            onValueChange={(v) => update.mutate({ id: o.id, patch: { technician_id: v === "_unassigned" ? null : v } })}>
            <SelectTrigger className="h-7 w-[110px] text-[11px]"><SelectValue placeholder="Tech" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_unassigned" className="text-xs">Unassigned</SelectItem>
              {techs.map((t: any) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
            title="Delete" onClick={() => { if (confirm("Delete this work order?")) remove.mutate(o.id); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total ROs", value: kpi.total },
          { label: "Open", value: kpi.open },
          { label: "Done", value: kpi.done },
          { label: "Comebacks", value: kpi.comebacks },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-2 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Hammer className="w-4 h-4" /> Work Orders
          </CardTitle>
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="list" className="h-7 px-2 text-xs gap-1"><List className="w-3.5 h-3.5" /> List</TabsTrigger>
                <TabsTrigger value="kanban" className="h-7 px-2 text-xs gap-1"><LayoutGrid className="w-3.5 h-3.5" /> Kanban</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus className="w-3.5 h-3.5" /> New RO
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by RO number, customer, vehicle, or notes" className="pl-9"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Hammer className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No work orders yet. Create one to get started.</p>
            </div>
          ) : view === "list" ? (
            <div className="space-y-2">
              {filtered.map((o: any) => <WOCard key={o.id} o={o} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 overflow-x-auto">
              {COLS.map((col) => (
                <div key={col.id} className="space-y-2 min-w-[180px]">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</p>
                    <Badge variant="outline" className="text-[10px]">{grouped[col.id]?.length ?? 0}</Badge>
                  </div>
                  <div className="space-y-2 min-h-[120px]">
                    {(grouped[col.id] ?? []).map((o: any) => (
                      <Card key={o.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{o.number}</p>
                            <div className="flex gap-1">
                              {o.is_comeback && <Badge variant="destructive" className="text-[9px]">CB</Badge>}
                              {o.converted_invoice && <Badge variant="outline" className="text-[9px]">INV</Badge>}
                            </div>
                          </div>
                          {(o.customer_name || o.vehicle_label) && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {o.customer_name}{o.vehicle_label ? ` · ${o.vehicle_label}` : ""}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {o.labor_hours != null && <span className="flex items-center gap-0.5"><Timer className="w-3 h-3" />{o.labor_hours}h</span>}
                            <span>{fmt(o.total_cents ?? 0)}</span>
                          </div>
                          <Select value={o.status}
                            onValueChange={(v) => update.mutate({ id: o.id, patch: { status: v } })}>
                            <SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {COLS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Select value={o.technician_id ?? "_unassigned"}
                            onValueChange={(v) => update.mutate({ id: o.id, patch: { technician_id: v === "_unassigned" ? null : v } })}>
                            <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Assign tech" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_unassigned">Unassigned</SelectItem>
                              {techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(o)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500" title="Copy customer status link" onClick={() => shareStatus(o)}>
                              <Link2 className="w-3.5 h-3.5" />
                            </Button>
                            {!o.converted_invoice && o.status === "done" && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600"
                                title="Convert to Invoice" onClick={() => convertToInvoice.mutate(o)}>
                                <Receipt className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <LaborGuidePickerDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        title="Labor Guide — set hours"
        onSelect={(entry: LaborGuideEntry) => {
          setForm(f => ({
            ...f,
            labor_hours: String(entry.baseHours),
            notes: f.notes
              ? `${f.notes}\n${entry.service} (${entry.baseHours}h std)`
              : `${entry.service} (${entry.baseHours}h std)${entry.notes ? " — " + entry.notes : ""}`,
          }));
          toast.info(`Labor hours set to ${entry.baseHours}h for "${entry.service}"`);
        }}
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hammer className="w-4 h-4" /> {editId ? "Edit Work Order" : "New Work Order"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">RO number</Label>
                <Input placeholder="Auto-generated if blank" value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })} />
              </div>
              <div className="flex items-end gap-3 pb-0.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" checked={form.is_comeback}
                    onChange={(e) => setForm({ ...form, is_comeback: e.target.checked })}
                    className="w-4 h-4 rounded" />
                  <AlertOctagon className="w-3.5 h-3.5 text-destructive" />
                  Comeback
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Customer</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Customer name" value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                <Input placeholder="Vehicle (e.g. 2020 Toyota Camry)" value={form.vehicle_label}
                  onChange={(e) => setForm({ ...form, vehicle_label: e.target.value })} />
                <Input type="tel" placeholder="Phone" value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                <Input type="email" placeholder="Email" value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Labor hours</Label>
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                  >
                    <BookOpen className="w-3 h-3" /> Labor Guide
                  </button>
                </div>
                <Input type="number" min="0" step="0.5" placeholder="e.g. 2.5" value={form.labor_hours}
                  onChange={(e) => setForm({ ...form, labor_hours: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Total ($)</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.total_cents_str}
                  onChange={(e) => setForm({ ...form, total_cents_str: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea placeholder="Service notes, special instructions…" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editId ? "Save changes" : "Create RO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
