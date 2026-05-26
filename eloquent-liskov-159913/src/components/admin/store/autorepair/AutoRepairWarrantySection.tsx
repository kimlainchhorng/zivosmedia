/**
 * Auto Repair — Warranty & Comebacks
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, Plus, Network, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { WARRANTY_NETWORKS, getWarrantyNetwork } from "@/config/warrantyNetworks";
import WarrantyNetworkLogo from "./WarrantyNetworkLogo";

interface Props { storeId: string }

export default function AutoRepairWarrantySection({ storeId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [networkFilter, setNetworkFilter] = useState<string>("all");
  const [networkQuery, setNetworkQuery] = useState("");
  const [warrantySearch, setWarrantySearch] = useState("");
  const [form, setForm] = useState({
    workorder_id: "",
    service_name: "",
    period_days: 90,
    mileage_limit: 6000,
    notes: "",
    network_id: "",
    claim_number: "",
  });

  const { data: warranties = [] } = useQuery({
    queryKey: ["ar-warranties", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_warranties" as any).select("*").eq("store_id", storeId).order("starts_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["ar-work-orders", storeId],
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_work_orders" as any).select("id,number,is_comeback,status").eq("store_id", storeId);
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = useMemo(() => {
    const total = orders.length;
    const comebacks = orders.filter((o: any) => o.is_comeback).length;
    const rate = total > 0 ? (comebacks / total) * 100 : 0;
    return { total, comebacks, rate };
  }, [orders]);

  const filteredWarranties = useMemo(() => {
    let list = warranties;
    if (networkFilter !== "all") list = list.filter((w: any) => (w.notes ?? "").includes(`[network:${networkFilter}]`));
    if (warrantySearch.trim()) {
      const s = warrantySearch.toLowerCase();
      list = list.filter((w: any) => `${w.service_name ?? ""} ${w.notes ?? ""}`.toLowerCase().includes(s));
    }
    return list;
  }, [warranties, networkFilter, warrantySearch]);

  const filteredNetworks = useMemo(() => {
    const q = networkQuery.trim().toLowerCase();
    if (!q) return WARRANTY_NETWORKS;
    return WARRANTY_NETWORKS.filter((n) =>
      n.name.toLowerCase().includes(q) || (n.shortName?.toLowerCase().includes(q) ?? false)
    );
  }, [networkQuery]);

  const create = useMutation({
    mutationFn: async () => {
      const expires_at = form.period_days
        ? new Date(Date.now() + form.period_days * 86400000).toISOString().slice(0, 10)
        : null;
      // Encode network + claim into notes (no schema change needed)
      const tags = [
        form.network_id ? `[network:${form.network_id}]` : "",
        form.claim_number ? `[claim:${form.claim_number}]` : "",
      ].filter(Boolean).join(" ");
      const notes = [tags, form.notes].filter(Boolean).join("\n");
      const { error } = await supabase.from("ar_warranties" as any).insert({
        store_id: storeId,
        workorder_id: form.workorder_id,
        service_name: form.service_name,
        period_days: form.period_days,
        mileage_limit: form.mileage_limit,
        notes,
        expires_at,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Warranty added");
      qc.invalidateQueries({ queryKey: ["ar-warranties", storeId] });
      setOpen(false);
      setForm({ workorder_id: "", service_name: "", period_days: 90, mileage_limit: 6000, notes: "", network_id: "", claim_number: "" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteWarranty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_warranties" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Warranty removed");
      qc.invalidateQueries({ queryKey: ["ar-warranties", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleComeback = useMutation({
    mutationFn: async ({ id, is_comeback }: { id: string; is_comeback: boolean }) => {
      const { error } = await supabase.from("ar_work_orders" as any).update({ is_comeback }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-work-orders", storeId] }),
  });

  const extractNetwork = (notes?: string) => {
    const m = notes?.match(/\[network:([^\]]+)\]/);
    return m ? getWarrantyNetwork(m[1]) : undefined;
  };
  const extractClaim = (notes?: string) => notes?.match(/\[claim:([^\]]+)\]/)?.[1];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Warranty & Comebacks</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Total ROs</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Comebacks</p>
            <p className="text-2xl font-bold">{stats.comebacks}</p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-[11px] uppercase text-muted-foreground">Comeback rate</p>
            <p className="text-2xl font-bold">{stats.rate.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Select value={networkFilter} onValueChange={setNetworkFilter}>
          <SelectTrigger className="h-9 w-[260px]"><SelectValue placeholder="Filter by network" /></SelectTrigger>
          <SelectContent className="max-h-[320px]">
            <SelectItem value="all">All warranty networks</SelectItem>
            {WARRANTY_NETWORKS.map((n) => (
              <SelectItem key={n.id} value={n.id}>{n.shortName ?? n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Warranty</Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Active Warranties</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by service name…" className="pl-9 h-9" value={warrantySearch}
              onChange={(e) => setWarrantySearch(e.target.value)} />
          </div>
          {filteredWarranties.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No warranties on file.</p>
          ) : (
            <div className="space-y-2">
              {filteredWarranties.map((w: any) => {
                const net = extractNetwork(w.notes);
                const claim = extractClaim(w.notes);
                const isExpired = w.expires_at && new Date(w.expires_at) < new Date();
                return (
                  <div key={w.id} className={`flex items-center justify-between border rounded-lg p-3 gap-3 ${isExpired ? "border-destructive/40 bg-destructive/5" : "border-border"}`}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {net && <WarrantyNetworkLogo network={net} size="md" />}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{w.service_name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {net ? `${net.shortName ?? net.name} · ` : ""}
                          {w.period_days}d · {w.mileage_limit?.toLocaleString()} mi
                          {claim ? ` · Claim #${claim}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExpired
                        ? <Badge variant="destructive" className="text-[10px]">Expired</Badge>
                        : <Badge variant="outline" className="text-[10px]">{w.expires_at ?? "—"}</Badge>
                      }
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm("Remove this warranty?")) deleteWarranty.mutate(w.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Flag Comeback</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No work orders yet.</p>
          ) : (
            <div className="space-y-1.5">
              {orders.map((o: any) => (
                <div key={o.id} className="flex items-center justify-between text-sm">
                  <span>{o.number} · <span className="text-muted-foreground capitalize">{o.status}</span></span>
                  <Button size="sm" variant={o.is_comeback ? "destructive" : "outline"}
                    onClick={() => toggleComeback.mutate({ id: o.id, is_comeback: !o.is_comeback })}>
                    {o.is_comeback ? "Comeback" : "Mark comeback"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Network className="w-4 h-4" /> Warranty Networks
            <Badge variant="outline" className="ml-1 text-[10px]">{WARRANTY_NETWORKS.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-9"
              placeholder="Search providers (Endurance, NAC, AGWS...)"
              value={networkQuery}
              onChange={(e) => setNetworkQuery(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-[280px] overflow-auto">
            {filteredNetworks.map((n) => (
              <button type="button"
                key={n.id}
                onClick={() => { setForm((f) => ({ ...f, network_id: n.id })); setOpen(true); }}
                className="flex items-center gap-2.5 text-left text-[12px] border border-border rounded-md px-2 py-1.5 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <WarrantyNetworkLogo network={n} size="md" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{n.shortName ?? n.name}</p>
                  {n.category && <p className="text-[10px] text-muted-foreground">{n.category}</p>}
                </div>
              </button>
            ))}
            {filteredNetworks.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full text-center py-4">No providers match.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Warranty</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Select value={form.workorder_id} onValueChange={(v) => setForm({ ...form, workorder_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
              <SelectContent>{orders.map((o: any) => <SelectItem key={o.id} value={o.id}>{o.number}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Service name (e.g. Brake pads)" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Days" value={form.period_days} onChange={(e) => setForm({ ...form, period_days: Number(e.target.value) || 0 })} />
              <Input type="number" placeholder="Mileage limit" value={form.mileage_limit} onChange={(e) => setForm({ ...form, mileage_limit: Number(e.target.value) || 0 })} />
            </div>
            <Select value={form.network_id || "none"} onValueChange={(v) => setForm({ ...form, network_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Warranty network (optional)" /></SelectTrigger>
              <SelectContent className="max-h-[280px]">
                <SelectItem value="none">In-house (no third-party)</SelectItem>
                {WARRANTY_NETWORKS.map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.shortName ?? n.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Claim / contract # (optional)" value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} />
            <Textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.workorder_id || !form.service_name} onClick={() => create.mutate()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
