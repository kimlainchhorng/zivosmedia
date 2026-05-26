/**
 * Auto Repair — Estimates & Quotes
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileSignature, Plus, Send, ArrowRightCircle, Search, Trash2,
  ClipboardList, Download, Pencil, ChevronDown, ChevronUp,
  Link2, CheckCircle2, XCircle, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import LaborGuidePickerDialog from "./LaborGuidePickerDialog";
import type { LaborGuideEntry } from "@/lib/laborGuide";

interface Props { storeId: string }

type LineItem = { kind: "part" | "labor" | "diagnosis"; name: string; qty: number; unit_cents: number };

const STATUSES = ["draft", "sent", "approved", "declined", "expired"] as const;
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline", sent: "secondary", approved: "default", declined: "destructive", expired: "outline",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "text-muted-foreground", sent: "text-blue-600", approved: "text-emerald-600",
  declined: "text-destructive", expired: "text-orange-500",
};

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const blankForm = {
  number: "", customer_name: "", customer_phone: "", customer_email: "",
  vehicle_label: "", notes: "", tax_rate: "0", expiry_date: "",
};
const blankItem = (): LineItem => ({ kind: "labor", name: "", qty: 1, unit_cents: 0 });

export default function AutoRepairEstimatesSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["ar-estimates", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_estimates" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const kpi = useMemo(() => ({
    total: estimates.length,
    draft: estimates.filter((e: any) => e.status === "draft").length,
    approved: estimates.filter((e: any) => e.status === "approved").length,
    pending: estimates.filter((e: any) => e.status === "sent").length,
  }), [estimates]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unit_cents, 0);
  const taxRate = Math.max(0, Math.min(100, parseFloat(form.tax_rate) || 0));
  const taxCents = Math.round(subtotal * taxRate / 100);
  const total = subtotal + taxCents;

  const resetForm = () => {
    setForm(blankForm);
    setItems([blankItem()]);
    setEditId(null);
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({
      number: e.number ?? "",
      customer_name: e.customer_name ?? "",
      customer_phone: e.customer_phone ?? "",
      customer_email: e.customer_email ?? "",
      vehicle_label: e.vehicle_label ?? "",
      notes: e.notes ?? "",
      tax_rate: e.tax_rate != null ? String(e.tax_rate) : "0",
      expiry_date: e.expiry_date ?? "",
    });
    setItems((e.line_items as LineItem[]) ?? [blankItem()]);
    setOpen(true);
  };

  const saveEstimate = useMutation({
    mutationFn: async () => {
      const payload: any = {
        store_id: storeId,
        number: form.number || `EST-${Date.now().toString().slice(-6)}`,
        status: editId ? undefined : "draft",
        line_items: items as any,
        subtotal_cents: subtotal,
        tax_cents: taxCents,
        tax_rate: taxRate,
        total_cents: total,
        notes: form.notes || null,
        customer_name: form.customer_name || null,
        customer_phone: form.customer_phone || null,
        customer_email: form.customer_email || null,
        vehicle_label: form.vehicle_label || null,
        expiry_date: form.expiry_date || null,
      };
      if (editId) {
        delete payload.status;
        const { error } = await supabase.from("ar_estimates" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        payload.status = "draft";
        const { error } = await supabase.from("ar_estimates" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Estimate updated" : "Estimate created");
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ar_estimates" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeEstimate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_estimates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estimate deleted");
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const convertToWO = useMutation({
    mutationFn: async (est: any) => {
      const { data, error } = await supabase.from("ar_work_orders" as any).insert({
        store_id: storeId,
        estimate_id: est.id,
        number: `WO-${Date.now().toString().slice(-6)}`,
        status: "awaiting",
        parts_used: (est.line_items || []).filter((i: any) => i.kind === "part"),
        total_cents: est.total_cents,
        customer_name: est.customer_name,
        customer_phone: est.customer_phone,
        customer_email: est.customer_email,
        vehicle_label: est.vehicle_label,
      }).select("id").single();
      if (error) throw error;
      await supabase.from("ar_estimates" as any).update({
        status: "approved",
        converted_workorder_id: (data as any).id,
      }).eq("id", est.id);
    },
    onSuccess: () => {
      toast.success("Converted to Work Order");
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const sendToCustomer = async (est: any) => {
    setSendingId(est.id);
    const token = est.share_token || crypto.randomUUID();
    if (!est.share_token) {
      const { error } = await supabase
        .from("ar_estimates" as any)
        .update({ share_token: token, status: "sent" })
        .eq("id", est.id);
      if (error) { toast.error(error.message); setSendingId(null); return; }
      qc.invalidateQueries({ queryKey: ["ar-estimates", storeId] });
    }
    const url = `${window.location.origin}/estimate/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Approval link copied — send it to your customer", { duration: 4000 });
    setSendingId(null);
  };

  const printEstimate = (e: any) => {
    const items: LineItem[] = e.line_items ?? [];
    const html = `
      <html><head><title>Estimate ${e.number}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}th{font-size:11px;text-transform:uppercase;color:#666}.right{text-align:right}.total{font-size:18px;font-weight:bold}</style>
      </head><body>
      <h1>Estimate ${e.number}</h1>
      <p><b>Customer:</b> ${e.customer_name || "—"} &nbsp;|&nbsp; <b>Vehicle:</b> ${e.vehicle_label || "—"}</p>
      ${e.customer_phone ? `<p><b>Phone:</b> ${e.customer_phone}</p>` : ""}
      ${e.customer_email ? `<p><b>Email:</b> ${e.customer_email}</p>` : ""}
      ${e.expiry_date ? `<p><b>Valid until:</b> ${new Date(e.expiry_date).toLocaleDateString()}</p>` : ""}
      <table><tr><th>Type</th><th>Description</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr>
      ${items.map(it => `<tr><td>${it.kind}</td><td>${it.name}</td><td class="right">${it.qty}</td><td class="right">$${(it.unit_cents / 100).toFixed(2)}</td><td class="right">$${(it.qty * it.unit_cents / 100).toFixed(2)}</td></tr>`).join("")}
      </table>
      <div style="margin-top:16px;text-align:right">
        <p>Subtotal: ${fmt(e.subtotal_cents)}</p>
        ${e.tax_cents ? `<p>Tax: ${fmt(e.tax_cents)}</p>` : ""}
        <p class="total">Total: ${fmt(e.total_cents)}</p>
      </div>
      ${e.notes ? `<p style="margin-top:16px;color:#555"><b>Notes:</b> ${e.notes}</p>` : ""}
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const filtered = useMemo(() => estimates.filter((e: any) =>
    !q || `${e.number} ${e.customer_name ?? ""} ${e.vehicle_label ?? ""} ${e.notes ?? ""}`
      .toLowerCase().includes(q.toLowerCase())
  ), [estimates, q]);

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: kpi.total },
          { label: "Draft", value: kpi.draft },
          { label: "Awaiting", value: kpi.pending },
          { label: "Approved", value: kpi.approved },
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Estimates & Quotes
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> New Estimate
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by number, customer, vehicle, or notes" className="pl-9"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground px-1 py-6 text-center">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No estimates yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((e: any) => {
                const isExpanded = expandedId === e.id;
                return (
                  <div key={e.id} className="rounded-xl border border-border overflow-hidden">
                    <div className="flex items-center justify-between p-3 hover:bg-muted/40 transition gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-sm">{e.number}</span>
                          <Badge variant={STATUS_VARIANT[e.status]} className="text-[10px] capitalize">{e.status}</Badge>
                          {e.converted_workorder_id && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <ArrowRightCircle className="w-3 h-3" /> WO created
                            </Badge>
                          )}
                          {e.expiry_date && new Date(e.expiry_date) < new Date() && e.status !== "expired" && (
                            <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {e.customer_name || "No customer"}
                          {e.vehicle_label ? ` · ${e.vehicle_label}` : ""}
                          {` · ${e.line_items?.length ?? 0} items`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <p className="font-bold text-sm tabular-nums">{fmt(e.total_cents)}</p>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Print / PDF"
                            onClick={() => printEstimate(e)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit"
                            onClick={() => openEdit(e)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {(e.status === "draft" || e.status === "sent") && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-600" title="Copy customer approval link"
                              disabled={sendingId === e.id}
                              onClick={() => sendToCustomer(e)}>
                              <Link2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {!e.converted_workorder_id && e.status !== "declined" && e.status !== "expired" && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Convert to Work Order"
                              onClick={() => convertToWO.mutate(e)}>
                              <ArrowRightCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Select value={e.status} onValueChange={(v) => setStatus.mutate({ id: e.id, status: v })}>
                            <SelectTrigger className="h-7 w-[100px] text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                            title="Delete" onClick={() => { if (confirm("Delete this estimate?")) removeEstimate.mutate(e.id); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => setExpandedId(isExpanded ? null : e.id)}>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t px-4 py-3 bg-muted/20 space-y-2 text-sm">
                        {e.customer_email && <p className="text-xs text-muted-foreground">Email: {e.customer_email}</p>}
                        {e.customer_phone && <p className="text-xs text-muted-foreground">Phone: {e.customer_phone}</p>}
                        {e.expiry_date && <p className="text-xs text-muted-foreground">Valid until: {new Date(e.expiry_date).toLocaleDateString()}</p>}
                        {e.share_token && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-blue-600 font-medium">Approval link active</span>
                            {e.customer_viewed_at && <span className="text-xs text-muted-foreground">· Viewed {new Date(e.customer_viewed_at).toLocaleDateString()}</span>}
                            {e.customer_responded_at && (
                              e.status === "approved"
                                ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3 h-3" /> Approved by customer</span>
                                : <span className="flex items-center gap-1 text-xs text-destructive"><XCircle className="w-3 h-3" /> Declined by customer</span>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => sendToCustomer(e)}>
                              <Link2 className="w-3 h-3 mr-1" /> Copy link
                            </Button>
                          </div>
                        )}
                        {(e.line_items ?? []).length > 0 && (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground uppercase text-[10px]">
                                <th className="text-left pb-1">Type</th>
                                <th className="text-left pb-1">Description</th>
                                <th className="text-right pb-1">Qty</th>
                                <th className="text-right pb-1">Unit</th>
                                <th className="text-right pb-1">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(e.line_items as LineItem[]).map((it, idx) => (
                                <tr key={idx} className="border-t border-border/50">
                                  <td className="py-1 capitalize pr-2">{it.kind}</td>
                                  <td className="py-1 pr-2">{it.name || "—"}</td>
                                  <td className="py-1 text-right pr-2">{it.qty}</td>
                                  <td className="py-1 text-right pr-2">{fmt(it.unit_cents)}</td>
                                  <td className="py-1 text-right font-medium">{fmt(it.qty * it.unit_cents)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                        <div className="flex justify-end gap-6 pt-1 border-t text-xs">
                          <span className="text-muted-foreground">Subtotal: {fmt(e.subtotal_cents)}</span>
                          {e.tax_cents > 0 && <span className="text-muted-foreground">Tax: {fmt(e.tax_cents)}</span>}
                          <span className="font-bold">Total: {fmt(e.total_cents)}</span>
                        </div>
                        {e.notes && <p className="text-xs text-muted-foreground pt-1">Notes: {e.notes}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <LaborGuidePickerDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        title="Labor Guide — add to estimate"
        onSelect={(entry: LaborGuideEntry) => {
          setItems(a => [...a, { kind: "labor", name: entry.service, qty: entry.baseHours, unit_cents: 0 }]);
          toast.info(`Added "${entry.service}" — ${entry.baseHours}h. Set your hourly rate.`);
        }}
      />

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-4 h-4" /> {editId ? "Edit Estimate" : "New Estimate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Estimate number</Label>
                <Input placeholder="Auto-generated if blank" value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valid until</Label>
                <Input type="date" value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Line items</p>
              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Select value={it.kind} onValueChange={(v: any) =>
                      setItems((arr) => arr.map((x, i) => i === idx ? { ...x, kind: v } : x))}>
                      <SelectTrigger className="col-span-3 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="part">Part</SelectItem>
                        <SelectItem value="labor">Labor</SelectItem>
                        <SelectItem value="diagnosis">Diagnosis</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input className="col-span-5 h-9" placeholder="Description" value={it.name}
                      onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                    <Input className="col-span-2 h-9" type="number" placeholder="Qty" value={it.qty || ""}
                      onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) || 0 } : x))} />
                    <div className="col-span-2 flex gap-1">
                      <Input className="h-9" type="number" placeholder="$" value={(it.unit_cents / 100) || ""}
                        onChange={(e) => setItems((arr) => arr.map((x, i) => i === idx ? { ...x, unit_cents: Math.round((Number(e.target.value) || 0) * 100) } : x))} />
                      {items.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 text-destructive"
                          onClick={() => setItems(arr => arr.filter((_, i) => i !== idx))}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline"
                  onClick={() => setItems((a) => [...a, blankItem()])}>
                  <Plus className="w-3 h-3 mr-1" /> Add line
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-primary border-primary/30 hover:bg-primary/5"
                  onClick={() => setGuideOpen(true)}>
                  <BookOpen className="w-3 h-3" /> From Labor Guide
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Tax rate (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" placeholder="0" value={form.tax_rate}
                  onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} />
              </div>
              <div className="flex flex-col justify-end">
                <Textarea placeholder="Notes (optional)" rows={2} value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Subtotal: {fmt(subtotal)}</p>
                {taxCents > 0 && <p>Tax ({taxRate}%): {fmt(taxCents)}</p>}
              </div>
              <span className="text-xl font-bold tabular-nums">{fmt(total)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => saveEstimate.mutate()} disabled={saveEstimate.isPending}>
              {saveEstimate.isPending ? "Saving..." : editId ? "Save changes" : "Create Estimate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
