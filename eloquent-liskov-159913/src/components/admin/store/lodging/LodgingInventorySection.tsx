/**
 * Lodging — Hotel Inventory & Supplies.
 * Track linens, toiletries, F&B stock, maintenance supplies, key fobs, etc.
 */
import { useMemo, useState } from "react";
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
  Package, Plus, Pencil, Trash2, AlertTriangle, RefreshCw, Search,
} from "lucide-react";
import { toast } from "sonner";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

type Category = "housekeeping" | "linen" | "amenities" | "fob_keys" | "fb_supplies" | "maintenance" | "office" | "other";

interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  unit: string;
  quantity_in_stock: number;
  reorder_threshold: number;
  unit_cost_cents: number;
  supplier: string | null;
  last_restocked_at: string | null;
  notes: string | null;
}

const CAT_LABEL: Record<Category, string> = {
  housekeeping: "Housekeeping",
  linen: "Linen & Bedding",
  amenities: "Guest Amenities",
  fob_keys: "Key Fobs / Cards",
  fb_supplies: "F&B Supplies",
  maintenance: "Maintenance",
  office: "Office / Admin",
  other: "Other",
};

const CAT_COLOR: Record<Category, string> = {
  housekeeping: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  linen: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  amenities: "bg-teal-500/10 text-teal-700 border-teal-500/20",
  fob_keys: "bg-zinc-500/10 text-zinc-600 border-zinc-500/20",
  fb_supplies: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  maintenance: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  office: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
  other: "bg-muted/40 text-muted-foreground border-border",
};

const BLANK: Partial<InventoryItem> = {
  name: "", category: "housekeeping", unit: "pcs",
  quantity_in_stock: 0, reorder_threshold: 5, unit_cost_cents: 0,
  supplier: "", notes: "",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export default function LodgingInventorySection({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterLow, setFilterLow] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<Partial<InventoryItem>>(BLANK);
  const [restockQty, setRestockQty] = useState<Record<string, string>>({});

  const query = useQuery({
    queryKey: ["lodge_inventory_items", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lodge_inventory_items")
        .select("*")
        .eq("store_id", storeId)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as InventoryItem[];
    },
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setDialogOpen(true); };
  const openEdit = (item: InventoryItem) => { setEditing(item); setForm(item); setDialogOpen(true); };

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        store_id: storeId,
        name: form.name,
        category: form.category,
        unit: form.unit || "pcs",
        quantity_in_stock: form.quantity_in_stock ?? 0,
        reorder_threshold: form.reorder_threshold ?? 5,
        unit_cost_cents: form.unit_cost_cents ?? 0,
        supplier: form.supplier || null,
        notes: form.notes || null,
      };
      if (editing) {
        const { error } = await (supabase as any).from("lodge_inventory_items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("lodge_inventory_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Item updated" : "Item added");
      qc.invalidateQueries({ queryKey: ["lodge_inventory_items", storeId] });
      setDialogOpen(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const restock = useMutation({
    mutationFn: async ({ item, qty }: { item: InventoryItem; qty: number }) => {
      const { error } = await (supabase as any)
        .from("lodge_inventory_items")
        .update({
          quantity_in_stock: item.quantity_in_stock + qty,
          last_restocked_at: new Date().toISOString(),
        })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: (_, { item }) => {
      toast.success(`Restocked: ${item.name}`);
      qc.invalidateQueries({ queryKey: ["lodge_inventory_items", storeId] });
      setRestockQty(p => ({ ...p, [item.id]: "" }));
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lodge_inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["lodge_inventory_items", storeId] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed"),
  });

  const all = query.data || [];
  const lowStock = all.filter(i => i.quantity_in_stock <= i.reorder_threshold);

  const filtered = useMemo(() => all.filter(i => {
    const q = search.toLowerCase();
    const matchesSearch = !q || i.name.toLowerCase().includes(q) || (i.supplier || "").toLowerCase().includes(q);
    const matchesCat = filterCat === "all" || i.category === filterCat;
    const matchesLow = !filterLow || i.quantity_in_stock <= i.reorder_threshold;
    return matchesSearch && matchesCat && matchesLow;
  }), [all, search, filterCat, filterLow]);

  const totalValue = all.reduce((s, i) => s + i.quantity_in_stock * i.unit_cost_cents, 0);

  const isValid = form.name?.trim();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Inventory & Supplies</CardTitle>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add item
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <LodgingQuickJump active="lodge-inventory" />
        <LodgingSectionStatusBanner
          title="Inventory & Supplies"
          icon={Package}
          countLabel="Low stock items"
          countValue={lowStock.length}
          fixLabel="Open Maintenance"
          fixTab="lodge-maintenance"
        />

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total items", value: all.length },
            { label: "Low stock", value: lowStock.length },
            { label: "Categories", value: new Set(all.map(i => i.category)).size },
            { label: "Total value", value: fmt(totalValue) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Low stock alert</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lowStock.map(i => i.name).slice(0, 4).join(", ")}{lowStock.length > 4 ? ` +${lowStock.length - 4} more` : ""} need restocking.
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="pl-8 h-8 text-xs" />
          </div>
          <Select value={filterCat} onValueChange={v => setFilterCat(v as any)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(Object.keys(CAT_LABEL) as Category[]).map(k => (
                <SelectItem key={k} value={k}>{CAT_LABEL[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button type="button"
            onClick={() => setFilterLow(v => !v)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${filterLow ? "border-amber-500 bg-amber-500/10 text-amber-700" : "border-border bg-card text-muted-foreground"}`}>
            Low stock only
          </button>
        </div>

        {/* Item table */}
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? "No inventory items yet. Add linens, toiletries, key fobs, and other supplies."
              : "No items match this filter."}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/30">
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Item</th>
                  <th className="text-left py-2 px-2 font-semibold text-muted-foreground hidden sm:table-cell">Category</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground">In stock</th>
                  <th className="text-right py-2 px-2 font-semibold text-muted-foreground hidden md:table-cell">Reorder at</th>
                  <th className="text-center py-2 px-2 font-semibold text-muted-foreground">Restock</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isLow = item.quantity_in_stock <= item.reorder_threshold;
                  const rqty = restockQty[item.id] || "";
                  return (
                    <tr key={item.id} className={`border-b border-border/50 hover:bg-muted/20 ${isLow ? "bg-amber-500/5" : ""}`}>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {isLow && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                          <span className="font-medium">{item.name}</span>
                        </div>
                        {item.supplier && <div className="text-[10px] text-muted-foreground">{item.supplier}</div>}
                      </td>
                      <td className="py-2 px-2 hidden sm:table-cell">
                        <Badge className={`text-[10px] border ${CAT_COLOR[item.category]}`}>{CAT_LABEL[item.category]}</Badge>
                      </td>
                      <td className={`text-right py-2 px-2 font-semibold ${isLow ? "text-amber-600" : ""}`}>
                        {item.quantity_in_stock} {item.unit}
                      </td>
                      <td className="text-right py-2 px-2 text-muted-foreground hidden md:table-cell">
                        {item.reorder_threshold} {item.unit}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1 justify-center">
                          <Input
                            type="number" min="1"
                            value={rqty}
                            onChange={e => setRestockQty(p => ({ ...p, [item.id]: e.target.value }))}
                            className="h-6 w-14 text-xs text-center p-1"
                            placeholder="qty"
                          />
                          <Button
                            size="sm" variant="outline" className="h-6 w-6 p-0"
                            title="Restock"
                            disabled={!rqty || restock.isPending}
                            onClick={() => restock.mutate({ item, qty: parseInt(rqty) || 0 })}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-0.5">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                            onClick={() => { if (confirm("Delete this item?")) deleteItem.mutate(item.id); }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit item" : "Add inventory item"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Item name *</Label>
                <Input value={form.name || ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bath towels, Shampoo, Key fob" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as Category })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CAT_LABEL) as Category[]).map(k => (
                      <SelectItem key={k} value={k}>{CAT_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit (pcs, kg, L, rolls…)</Label>
                <Input value={form.unit || ""} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pcs" />
              </div>
              <div>
                <Label>Quantity in stock</Label>
                <Input type="number" min="0" step="1"
                  value={form.quantity_in_stock ?? ""}
                  onChange={e => setForm({ ...form, quantity_in_stock: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Reorder threshold</Label>
                <Input type="number" min="0" step="1"
                  value={form.reorder_threshold ?? ""}
                  onChange={e => setForm({ ...form, reorder_threshold: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Unit cost (USD)</Label>
                <Input type="number" min="0" step="0.01"
                  value={form.unit_cost_cents ? (form.unit_cost_cents / 100).toFixed(2) : ""}
                  onChange={e => setForm({ ...form, unit_cost_cents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                  placeholder="0.00" />
              </div>
              <div>
                <Label>Supplier / vendor</Label>
                <Input value={form.supplier || ""} onChange={e => setForm({ ...form, supplier: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button disabled={!isValid || upsert.isPending} onClick={() => upsert.mutate()}>
                {upsert.isPending ? "Saving…" : editing ? "Update" : "Add item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
