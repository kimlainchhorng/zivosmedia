/**
 * Auto Repair — Digital Vehicle Inspections (DVI)
 * Persists to ar_inspections; share token for customer-facing report.
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
import ClipboardCheck from "lucide-react/dist/esm/icons/clipboard-check";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import Plus from "lucide-react/dist/esm/icons/plus";
import Send from "lucide-react/dist/esm/icons/send";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Printer from "lucide-react/dist/esm/icons/printer";
import FileText from "lucide-react/dist/esm/icons/file-text";
import { toast } from "sonner";

const POINTS = [
  "Brakes (Front)", "Brakes (Rear)", "Tires (Tread)", "Tire Pressure", "Battery Health",
  "Engine Oil", "Coolant Level", "Transmission Fluid", "Power Steering Fluid", "Brake Fluid",
  "Air Filter", "Cabin Filter", "Wiper Blades", "Headlights", "Taillights",
  "Belts", "Hoses", "Suspension", "Exhaust System", "Check Engine Code",
];

type Status = "good" | "attention" | "urgent";
const COLORS: Record<Status, string> = {
  good: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
  attention: "text-amber-600 bg-amber-500/10 border-amber-500/30",
  urgent: "text-red-600 bg-red-500/10 border-red-500/30",
};
const ICONS: Record<Status, any> = { good: CheckCircle2, attention: AlertTriangle, urgent: XCircle };

interface Props {
  storeId: string;
  onCreateEstimate?: (vehicleLabel: string) => void;
}
type Inspection = {
  id: string;
  vehicle_label: string | null;
  technician_name: string | null;
  status: string;
  checklist: Record<string, Status>;
  summary: string | null;
  share_token: string | null;
  sent_at: string | null;
  created_at: string;
};

export default function AutoRepairInspectionsSection({ storeId, onCreateEstimate }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [vehicleLabel, setVehicleLabel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [techName, setTechName] = useState("");
  const [summary, setSummary] = useState("");
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(POINTS.map(p => [p, "good" as Status]))
  );

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ["ar-inspections", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_inspections")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Inspection[];
    },
  });

  const counts = useMemo(() => Object.values(statuses).reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1; return acc;
  }, {} as Record<Status, number>), [statuses]);

  const reset = () => {
    setEditId(null); setVehicleLabel(""); setCustomerName(""); setCustomerPhone("");
    setTechName(""); setSummary("");
    setStatuses(Object.fromEntries(POINTS.map(p => [p, "good" as Status])));
  };

  const save = useMutation({
    mutationFn: async (status: "in_progress" | "completed" | "sent") => {
      const payload: any = {
        store_id: storeId,
        vehicle_label: vehicleLabel || null,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        technician_name: techName || null,
        checklist: statuses,
        summary: summary || null,
        status,
        sent_at: status === "sent" ? new Date().toISOString() : null,
      };
      if (editId) {
        const { error } = await supabase.from("ar_inspections").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_inspections").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      toast.success(vars === "sent" ? "Inspection saved & sent" : "Inspection saved");
      qc.invalidateQueries({ queryKey: ["ar-inspections", storeId] });
      setOpen(false); reset();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_inspections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["ar-inspections", storeId] });
    },
  });

  const startEdit = (i: Inspection) => {
    setEditId(i.id);
    setVehicleLabel(i.vehicle_label ?? "");
    setCustomerName((i as any).customer_name ?? "");
    setCustomerPhone((i as any).customer_phone ?? "");
    setTechName(i.technician_name ?? "");
    setSummary(i.summary ?? "");
    const merged = Object.fromEntries(POINTS.map(p => [p, (i.checklist?.[p] ?? "good") as Status]));
    setStatuses(merged);
    setOpen(true);
  };

  const printInspection = (i: Inspection) => {
    const cl = (i.checklist || {}) as Record<string, Status>;
    const statusLabel = { good: "✅ Good", attention: "⚠️ Attention", urgent: "🔴 Urgent" };
    const html = `<html><head><title>Inspection — ${i.vehicle_label || "Vehicle"}</title>
    <style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #ddd}th{font-size:11px;text-transform:uppercase;color:#666}.summary{margin-top:16px;padding:12px;background:#f5f5f5;border-radius:6px;font-size:13px}</style>
    </head><body>
    <h1>Digital Vehicle Inspection</h1>
    <p><b>Vehicle:</b> ${i.vehicle_label || "—"}</p>
    ${(i as any).customer_name ? `<p><b>Customer:</b> ${(i as any).customer_name}${(i as any).customer_phone ? ` · ${(i as any).customer_phone}` : ""}</p>` : ""}
    ${i.technician_name ? `<p><b>Technician:</b> ${i.technician_name}</p>` : ""}
    <p><b>Date:</b> ${new Date(i.created_at).toLocaleDateString()}</p>
    <table><tr><th>Inspection point</th><th>Status</th></tr>
    ${POINTS.map(p => `<tr><td>${p}</td><td>${statusLabel[cl[p] ?? "good"]}</td></tr>`).join("")}
    </table>
    ${i.summary ? `<div class="summary"><b>Summary / Recommendations:</b><br>${i.summary}</div>` : ""}
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const copyShare = (token: string | null) => {
    if (!token) return;
    const url = `${window.location.origin}/inspection/${token}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Customer link copied"),
      () => toast.error("Could not copy")
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" /> Digital Vehicle Inspections
            <Badge variant="secondary" className="ml-1">{inspections.length}</Badge>
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={() => { reset(); setOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Inspection
          </Button>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : inspections.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-3">
          <ClipboardCheck className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No inspections yet. Start a 20-point DVI for any vehicle.</p>
          <Button size="sm" onClick={() => { reset(); setOpen(true); }} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Start first inspection</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {inspections.map(i => {
            const cl = (i.checklist || {}) as Record<string, Status>;
            const c = Object.values(cl).reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {} as Record<Status, number>);
            return (
              <Card key={i.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{i.vehicle_label || "Untitled vehicle"}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{i.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="text-emerald-600">● {c.good || 0}</span>
                      <span className="text-amber-600">● {c.attention || 0}</span>
                      <span className="text-red-600">● {c.urgent || 0}</span>
                      {i.technician_name && <span className="text-muted-foreground">· {i.technician_name}</span>}
                      <span className="text-muted-foreground ml-auto">{new Date(i.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Print report" onClick={() => printInspection(i)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyShare(i.share_token)} title="Copy customer link">
                      <Link2 className="w-4 h-4" />
                    </Button>
                    {onCreateEstimate && ((c.attention || 0) + (c.urgent || 0) > 0) && (
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-amber-600 border-amber-500/40 hover:bg-amber-500/10" title="Create estimate from inspection findings" onClick={() => onCreateEstimate(i.vehicle_label || "")}>
                        <FileText className="w-3.5 h-3.5" /> Estimate
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-8" onClick={() => startEdit(i)}>Open</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete inspection?")) remove.mutate(i.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Inspection" : "New Inspection"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Vehicle (e.g. 2019 Honda Civic)" value={vehicleLabel} onChange={e => setVehicleLabel(e.target.value)} />
              <Input placeholder="Technician name" value={techName} onChange={e => setTechName(e.target.value)} />
              <Input placeholder="Customer name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <Input placeholder="Customer phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-emerald-600 border-emerald-500/40"><CheckCircle2 className="w-3 h-3 mr-1" /> Good · {counts.good || 0}</Badge>
              <Badge variant="outline" className="text-amber-600 border-amber-500/40"><AlertTriangle className="w-3 h-3 mr-1" /> Attention · {counts.attention || 0}</Badge>
              <Badge variant="outline" className="text-red-600 border-red-500/40"><XCircle className="w-3 h-3 mr-1" /> Urgent · {counts.urgent || 0}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POINTS.map(point => {
                const s = statuses[point];
                const Icon = ICONS[s];
                return (
                  <div key={point} className={`flex items-center justify-between p-2.5 rounded-xl border ${COLORS[s]}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium truncate">{point}</span>
                    </div>
                    <div className="flex gap-1">
                      {(["good", "attention", "urgent"] as Status[]).map(opt => (
                        <button type="button"
                          key={opt}
                          onClick={() => setStatuses({ ...statuses, [point]: opt })}
                          className={`w-6 h-6 rounded-full border-2 transition ${
                            s === opt
                              ? opt === "good" ? "bg-emerald-500 border-emerald-600" : opt === "attention" ? "bg-amber-500 border-amber-600" : "bg-red-500 border-red-600"
                              : "bg-background border-border"
                          }`}
                          aria-label={opt}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <Textarea placeholder="Summary or recommendations (optional)" rows={2} value={summary} onChange={e => setSummary(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
            <Button variant="secondary" onClick={() => save.mutate("in_progress")} disabled={save.isPending}>Save draft</Button>
            <Button onClick={() => save.mutate("sent")} disabled={save.isPending} className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Save & send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
