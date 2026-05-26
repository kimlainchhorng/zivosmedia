/**
 * Auto Repair — Tire Inventory
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CircleDot, Plus, Search, AlertTriangle, Trash2, Pencil, Minus } from "lucide-react";
import { toast } from "sonner";

interface Props { storeId: string }

const blankForm = {
  brand: "", model: "", size: "", load_index: "", speed_rating: "",
  season: "all-season", dot: "", qty: 0, cost_cents: 0, retail_cents: 0, reorder_point: 4,
};

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AutoRepairTiresSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);

  const { data: tires = [] } = useQuery({
    queryKey: ["ar-tires", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_tires" as any).select("*").eq("store_id", storeId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const stats = useMemo(() => ({
    total: tires.reduce((s: number, t: any) => s + (t.qty ?? 0), 0),
    value: tires.reduce((s: number, t: any) => s + (t.qty ?? 0) * (t.cost_cents ?? 0), 0),
    lowStock: tires.filter((t: any) => t.qty <= t.reorder_point).length,
  }), [tires]);

  const filtered = useMemo(() => tires.filter((t: any) =>
    !q || `${t.brand} ${t.model} ${t.size} ${t.dot ?? ""}`.toLowerCase().includes(q.toLowerCase())
  ), [tires, q]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.size.trim()) throw new Error("Size is required");
      const payload = { store_id: storeId, ...form };
      if (editId) {
        const { error } = await supabase.from("ar_tires" as any).update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_tires" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Tire updated" : "Tire added");
      qc.invalidateQueries({ queryKey: ["ar-tires", storeId] });
      setOpen(false); setEditId(null); setForm(blankForm);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const adjustQty = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const tire = tires.find((t: any) => t.id === id);
      if (!tire) return;
      const newQty = Math.max(0, (tire.qty ?? 0) + delta);
      const { error } = await supabase.from("ar_tires" as any).update({ qty: newQty }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-tires", storeId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_tires" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tire removed");
      qc.invalidateQueries({ queryKey: ["ar-tires", storeId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openNew = () => { setEditId(null); setForm(blankForm); setOpen(true); };
  const openEdit = (t: any) => {
    setEditId(t.id);
    setForm({
      brand: t.brand ?? "", model: t.model ?? "", size: t.size ?? "",
      load_index: t.load_index ?? "", speed_rating: t.speed_rating ?? "",
      season: t.season ?? "all-season", dot: t.dot ?? "",
      qty: t.qty ?? 0, cost_cents: t.cost_cents ?? 0,
      retail_cents: t.retail_cents ?? 0, reorder_point: t.reorder_point ?? 4,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Total units</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className="text-2xl font-bold">{fmt(stats.value)}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Inventory value</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2 text-center">
          <p className={`text-2xl font-bold ${stats.lowStock > 0 ? "text-destructive" : ""}`}>{stats.lowStock}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Low stock SKUs</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CircleDot className="w-4 h-4" /> Tire Inventory
            {stats.lowStock > 0 && (
              <Badge variant="destructive" className="ml-2 gap-1">
                <AlertTriangle className="w-3 h-3" /> {stats.lowStock} low
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={openNew}>
            <Plus className="w-3.5 h-3.5" /> Add Tire
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by brand, size, DOT" className="pl-9" value={q}
              onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          {tires.length === 0 ? "No tires in stock — add your first SKU." : "No tires match your search."}
        </CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((t: any) => (
            <Card key={t.id} className={t.qty <= t.reorder_point ? "border-orange-500/40" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {t.brand} {t.model} <span className="font-mono text-sm text-muted-foreground">{t.size}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.season}
                      {t.load_index ? ` · ${t.load_index}` : ""}
                      {t.speed_rating ? `${t.speed_rating}` : ""}
                      {t.dot ? ` · DOT ${t.dot}` : ""}
                      {` · Cost ${fmt(t.cost_cents)} · Retail ${fmt(t.retail_cents)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Stock adjuster */}
                    <div className="flex items-center gap-1 border border-border rounded-lg">
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-r-none"
                        onClick={() => adjustQty.mutate({ id: t.id, delta: -1 })} disabled={t.qty <= 0}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className={`text-sm font-medium px-2 ${t.qty <= t.reorder_point ? "text-destructive" : ""}`}>
                        {t.qty}
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-l-none"
                        onClick={() => adjustQty.mutate({ id: t.id, delta: 1 })}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(t)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => { if (confirm(`Remove ${t.brand} ${t.size}?`)) del.mutate(t.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(blankForm); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Tire" : "Add Tire"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Brand</Label>
                <Input placeholder="e.g. Michelin" value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model</Label>
                <Input placeholder="e.g. Pilot Sport 4" value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Size * (e.g. 225/65R17)</Label>
              <Input placeholder="225/65R17" value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Load index</Label>
                <Input placeholder="e.g. 102" value={form.load_index}
                  onChange={(e) => setForm({ ...form, load_index: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Speed rating</Label>
                <Input placeholder="e.g. H" value={form.speed_rating}
                  onChange={(e) => setForm({ ...form, speed_rating: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Season</Label>
              <Select value={form.season} onValueChange={(v) => setForm({ ...form, season: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-season">All-season</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">DOT code</Label>
              <Input placeholder="e.g. XXXX4223" value={form.dot}
                onChange={(e) => setForm({ ...form, dot: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Qty</Label>
                <Input type="number" min="0" placeholder="0" value={form.qty || ""}
                  onChange={(e) => setForm({ ...form, qty: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cost ($)</Label>
                <Input type="number" min="0" placeholder="0.00" value={(form.cost_cents / 100) || ""}
                  onChange={(e) => setForm({ ...form, cost_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Retail ($)</Label>
                <Input type="number" min="0" placeholder="0.00" value={(form.retail_cents / 100) || ""}
                  onChange={(e) => setForm({ ...form, retail_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reorder point (alert when qty ≤ this)</Label>
              <Input type="number" min="0" value={form.reorder_point}
                onChange={(e) => setForm({ ...form, reorder_point: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.size.trim() || save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving..." : editId ? "Save changes" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
