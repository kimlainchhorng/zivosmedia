/**
 * SalonRetailProductsSection — inventory of physical take-home products
 * (shampoo, polish, styling tools).
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Package, Plus, Edit, Trash2, Loader2, AlertCircle, AlertTriangle, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SalonRetailProductsSectionProps { storeId: string; }

interface RetailProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  brand: string | null;
  price_cents: number;
  cost_cents: number;
  stock_quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
}

interface DraftState {
  name: string; description: string; sku: string; brand: string;
  price_dollars: string; cost_dollars: string;
  stock_quantity: string; low_stock_threshold: string;
  is_active: boolean;
}

const EMPTY: DraftState = {
  name: "", description: "", sku: "", brand: "", price_dollars: "", cost_dollars: "",
  stock_quantity: "0", low_stock_threshold: "3", is_active: true,
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SalonRetailProductsSection({ storeId }: SalonRetailProductsSectionProps) {
  const [rows, setRows] = useState<RetailProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_retail_products").select("*")
      .eq("store_id", storeId).order("name", { ascending: true });
    if (err) { console.error(err); setError("Couldn't load products."); setLoading(false); return; }
    setRows((data ?? []) as unknown as RetailProduct[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => r.name.toLowerCase().includes(q) || (r.brand || "").toLowerCase().includes(q) || (r.sku || "").toLowerCase().includes(q));
  }, [rows, search]);

  const lowStockCount = rows.filter((r) => r.is_active && r.stock_quantity <= r.low_stock_threshold).length;
  const totalInventoryValue = rows.reduce((sum, r) => sum + (r.cost_cents * r.stock_quantity), 0);

  const openAdd = () => { setEditingId(null); setDraft(EMPTY); setDialogOpen(true); };
  const openEdit = (p: RetailProduct) => {
    setEditingId(p.id);
    setDraft({
      name: p.name, description: p.description ?? "", sku: p.sku ?? "", brand: p.brand ?? "",
      price_dollars: (p.price_cents / 100).toFixed(2), cost_dollars: (p.cost_cents / 100).toFixed(2),
      stock_quantity: p.stock_quantity.toString(), low_stock_threshold: p.low_stock_threshold.toString(),
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { toast.error("Name is required."); return; }
    const priceCents = Math.round(Number(draft.price_dollars) * 100);
    const costCents = Math.round(Number(draft.cost_dollars) * 100);
    if (!Number.isFinite(priceCents) || priceCents < 0) { toast.error("Price must be 0 or more."); return; }
    setSaving(true);
    const payload = {
      store_id: storeId, name: draft.name.trim(), description: draft.description.trim() || null,
      sku: draft.sku.trim() || null, brand: draft.brand.trim() || null,
      price_cents: priceCents, cost_cents: Number.isFinite(costCents) ? Math.max(0, costCents) : 0,
      stock_quantity: Math.max(0, parseInt(draft.stock_quantity, 10) || 0),
      low_stock_threshold: Math.max(0, parseInt(draft.low_stock_threshold, 10) || 0),
      is_active: draft.is_active,
    };
    const op = editingId
      ? supabase.from("salon_retail_products").update(payload as never).eq("id", editingId)
      : supabase.from("salon_retail_products").insert(payload as never);
    const { error: err } = await op;
    setSaving(false);
    if (err) {
      // 23505 = unique_violation. With the per-store SKU unique index, this
      // fires when the SKU collides with an existing product.
      if ((err as { code?: string }).code === "23505") {
        setError(`Another product already uses SKU "${draft.sku.trim()}". Pick a different one.`);
      } else {
        setError(editingId ? "Couldn't save changes." : "Couldn't add product.");
      }
      return;
    }
    toast.success(editingId ? "Product updated." : "Product added.");
    setDialogOpen(false);
    await load();
  };

  const adjustStock = async (id: string, delta: number) => {
    setSaving(true);
    // Optimistic local update first — without this, rapid +/- clicks all
    // read the same starting stock_quantity from React state and dispatch
    // identical updates to the DB, dropping every click but the first.
    let next = 0;
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      next = Math.max(0, r.stock_quantity + delta);
      return { ...r, stock_quantity: next };
    }));
    const { error: err } = await supabase.from("salon_retail_products").update({ stock_quantity: next } as never).eq("id", id);
    setSaving(false);
    if (err) {
      setError("Couldn't adjust stock.");
      // Roll back the optimistic change so the UI reflects reality. Re-fetch
      // is the safest way since we don't know exactly what concurrent edits
      // happened.
      await load();
      return;
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setSaving(true);
    const { error: err } = await supabase.from("salon_retail_products").delete().eq("id", confirmDeleteId);
    setSaving(false);
    if (err) { setError("Couldn't delete."); return; }
    setConfirmDeleteId(null);
    toast.success("Product removed.");
    await load();
  };

  return (
    <div className="space-y-4">
      {error && <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base"><Package className="h-5 w-5 text-primary" /> Retail Products{rows.length > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{rows.length}</span>}</CardTitle>
          <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-4 w-4" /> Add product</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKUs</p>
              <p className="mt-0.5 text-xl font-bold text-foreground">{rows.length}</p>
            </div>
            <div className={cn("rounded-xl border p-3", lowStockCount > 0 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card")}>
              <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><AlertTriangle className="h-3 w-3" /> Low stock</p>
              <p className="mt-0.5 text-xl font-bold text-foreground">{lowStockCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inventory value (cost)</p>
              <p className="mt-0.5 text-xl font-bold text-foreground">{formatPrice(totalInventoryValue)}</p>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, brand, SKU…" className="pl-9" />
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No retail products yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add shampoos, polishes, styling tools — anything you sell to clients.</p>
              <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5"><Plus className="h-4 w-4" /> Add your first product</Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products match "{search}".</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((p) => {
                const isLow = p.is_active && p.stock_quantity <= p.low_stock_threshold;
                return (
                  <div key={p.id} className={cn("grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3", !p.is_active && "bg-muted/30", isLow && p.is_active && "bg-amber-500/5")}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("truncate text-sm font-semibold", !p.is_active && "text-muted-foreground")}>{p.name}</p>
                        {isLow && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"><AlertTriangle className="h-3 w-3" /> Low</span>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{p.brand ? `${p.brand} · ` : ""}{p.sku ?? ""}</p>
                      <p className="text-[11px] text-muted-foreground">{formatPrice(p.price_cents)} · cost {formatPrice(p.cost_cents)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => adjustStock(p.id, -1)} disabled={saving || p.stock_quantity === 0}>−</Button>
                      <span className="w-10 text-center text-sm font-bold">{p.stock_quantity}</span>
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => adjustStock(p.id, 1)} disabled={saving}>+</Button>
                    </div>
                    <div className="flex gap-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rpName">Name *</Label>
              <Input id="rpName" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rpBrand">Brand</Label>
                <Input id="rpBrand" value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpSku">SKU</Label>
                <Input id="rpSku" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} maxLength={40} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rpPrice">Sell price *</Label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input id="rpPrice" type="number" min={0} step="0.01" value={draft.price_dollars} onChange={(e) => setDraft({ ...draft, price_dollars: e.target.value })} className="pl-7" /></div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpCost">Cost</Label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span><Input id="rpCost" type="number" min={0} step="0.01" value={draft.cost_dollars} onChange={(e) => setDraft({ ...draft, cost_dollars: e.target.value })} className="pl-7" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rpStock">Stock on hand</Label>
                <Input id="rpStock" type="number" min={0} value={draft.stock_quantity} onChange={(e) => setDraft({ ...draft, stock_quantity: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpLow">Low-stock alert at</Label>
                <Input id="rpLow" type="number" min={0} value={draft.low_stock_threshold} onChange={(e) => setDraft({ ...draft, low_stock_threshold: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rpDesc">Description</Label>
              <Textarea id="rpDesc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} maxLength={500} />
            </div>
            <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <div className="min-w-0"><p className="text-sm font-semibold text-foreground">Available for sale</p></div>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{editingId ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {/* Surface inventory still on the shelf and the existence of past
                  sales — both are silently impacted by delete. Past sales rows
                  keep their product_name snapshot (FK is ON DELETE SET NULL)
                  but lose the catalog link, so the top-products report would
                  drop this product retroactively. */}
              {(() => {
                const p = rows.find((r) => r.id === confirmDeleteId);
                if (!p) return "This can't be undone.";
                const valueOnHand = p.stock_quantity * p.cost_cents;
                const parts: string[] = [];
                if (p.stock_quantity > 0) {
                  parts.push(`You still have ${p.stock_quantity} unit${p.stock_quantity === 1 ? "" : "s"} on hand${valueOnHand > 0 ? ` (~${formatPrice(valueOnHand)} at cost)` : ""}.`);
                }
                parts.push("Past sales keep their record but lose the catalog link, so this product won't appear in future top-product reports.");
                parts.push("To stop selling without losing history, untick \"Active\" instead. This can't be undone.");
                return parts.join(" ");
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep product</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
