/**
 * CafeInventorySection — inventory list with low-stock highlight, quick
 * "receive stock" and "log wastage" actions, and a recent-movements log.
 */
import { useMemo, useState } from "react";
import {
  Boxes, Plus, Loader2, AlertTriangle, ArrowDownToLine, Trash2,
  Pencil, History, Wrench, ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeInventory, type CafeInventoryItemDraft, type CafeMovementReason } from "@/hooks/cafe/useCafeInventory";
import { useCafeStockVariance } from "@/hooks/cafe/useCafeStockVariance";
import { useCafePurchasing } from "@/hooks/cafe/useCafePurchasing";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const fmtQty = (n: number, unit: string) => `${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)} ${unit}`;
const UNITS = ["unit", "kg", "g", "L", "ml", "oz", "lb", "box", "case", "bottle"];

const blank = (): CafeInventoryItemDraft => ({
  name: "", sku: null, category: null, unit: "unit",
  low_stock_threshold: 0, cost_per_unit_cents: 0,
  default_supplier: null, is_active: true,
});

export default function CafeInventorySection({ storeId }: Props) {
  const { items, movements, lowStockItems, loading, saving, createItem, updateItem, removeItem, recordMovement } = useCafeInventory(storeId);
  const { rows: varianceRows, totalCostLostCents } = useCafeStockVariance(storeId, 30);
  const { suppliers, createOrder: createPurchaseOrder, saving: purchasingSaving } = useCafePurchasing(storeId);

  // Reorder dialog state — populated from the current lowStockItems each time
  // it opens so quantities reflect the latest counts, not a stale snapshot.
  const [reorderDialog, setReorderDialog] = useState(false);
  const [reorderSupplier, setReorderSupplier] = useState<string>("");
  const [reorderLines, setReorderLines] = useState<Record<string, { qty: string; selected: boolean }>>({});

  const openReorderDialog = () => {
    const seeded: Record<string, { qty: string; selected: boolean }> = {};
    for (const it of lowStockItems) {
      // Target = 2× threshold (a safe restock buffer); fall back to 1 if
      // threshold is 0 so the line still appears.
      const target = Math.max(it.low_stock_threshold * 2, 1);
      const need = Math.max(target - Number(it.on_hand_qty), 1);
      seeded[it.id] = { qty: String(need), selected: true };
    }
    setReorderLines(seeded);
    setReorderSupplier(suppliers[0]?.id ?? "");
    setReorderDialog(true);
  };

  const submitReorder = async () => {
    const lines = lowStockItems
      .filter((it) => reorderLines[it.id]?.selected)
      .map((it) => ({
        inventory_item_id: it.id,
        qty_ordered: Math.max(0.01, parseFloat(reorderLines[it.id]?.qty || "0")),
        unit_cost_cents: it.cost_per_unit_cents ?? 0,
      }))
      .filter((l) => l.qty_ordered > 0);
    if (lines.length === 0) { toast.error("Pick at least one item to reorder."); return; }
    const result = await createPurchaseOrder({
      supplier_id: reorderSupplier || null,
      notes: "Auto-generated from low stock",
      items: lines,
    });
    if (result) {
      toast.success(`Draft PO created with ${lines.length} item${lines.length === 1 ? "" : "s"}.`);
      setReorderDialog(false);
    }
  };

  const [itemDialog, setItemDialog] = useState(false);
  const [draft, setDraft] = useState<CafeInventoryItemDraft>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);

  const [moveDialog, setMoveDialog] = useState<{ open: boolean; itemId: string | null; reason: CafeMovementReason }>({ open: false, itemId: null, reason: "received" });
  const [moveQty, setMoveQty] = useState("");
  const [moveCost, setMoveCost] = useState("");
  const [moveNotes, setMoveNotes] = useState("");

  const [logDialog, setLogDialog] = useState<{ open: boolean; itemId: string | null }>({ open: false, itemId: null });

  // Stocktake: { item_id -> actual count typed by user }. Initial value
  // when the dialog opens is each item's current on_hand_qty.
  const [stocktakeOpen, setStocktakeOpen] = useState(false);
  const [stocktakeCounts, setStocktakeCounts] = useState<Record<string, string>>({});
  const [stocktakeSubmitting, setStocktakeSubmitting] = useState(false);

  const totals = useMemo(() => {
    let value = 0;
    for (const i of items) {
      if (!i.is_active) continue;
      value += Math.max(0, Number(i.on_hand_qty)) * i.cost_per_unit_cents;
    }
    return { value, count: items.length, active: items.filter((i) => i.is_active).length };
  }, [items]);

  const openMove = (itemId: string, reason: CafeMovementReason) => {
    setMoveDialog({ open: true, itemId, reason });
    setMoveQty("");
    setMoveCost("");
    setMoveNotes("");
  };

  const openStocktake = () => {
    const initial: Record<string, string> = {};
    for (const i of items) {
      if (i.is_active) initial[i.id] = Number(i.on_hand_qty).toString();
    }
    setStocktakeCounts(initial);
    setStocktakeOpen(true);
  };

  // Variance summary used both in the dialog header and the submit gate.
  const stocktakeSummary = useMemo(() => {
    let variances = 0;
    let net_cents = 0; // signed change in stock value
    for (const i of items) {
      if (!i.is_active) continue;
      const actualStr = stocktakeCounts[i.id];
      if (actualStr === undefined || actualStr === "") continue;
      const actual = parseFloat(actualStr);
      if (!Number.isFinite(actual)) continue;
      const expected = Number(i.on_hand_qty);
      if (Math.abs(actual - expected) < 0.0005) continue;
      variances++;
      net_cents += Math.round((actual - expected) * i.cost_per_unit_cents);
    }
    return { variances, net_cents };
  }, [items, stocktakeCounts]);

  const submitStocktake = async () => {
    if (stocktakeSummary.variances === 0) {
      toast.info("Nothing to adjust.");
      return;
    }
    setStocktakeSubmitting(true);
    let ok = 0;
    for (const i of items) {
      if (!i.is_active) continue;
      const actualStr = stocktakeCounts[i.id];
      if (actualStr === undefined || actualStr === "") continue;
      const actual = parseFloat(actualStr);
      if (!Number.isFinite(actual)) continue;
      const expected = Number(i.on_hand_qty);
      const delta = actual - expected;
      if (Math.abs(delta) < 0.0005) continue;
      const res = await recordMovement({
        inventory_item_id: i.id,
        reason: "adjust",
        qty_change: delta,
        unit_cost_cents: i.cost_per_unit_cents,
        reference: "stocktake",
      });
      if (res.ok) ok++;
    }
    setStocktakeSubmitting(false);
    if (ok > 0) {
      toast.success(`Stocktake saved · ${ok} item${ok === 1 ? "" : "s"} adjusted.`);
      setStocktakeOpen(false);
    } else {
      toast.error("Couldn't save stocktake.");
    }
  };

  const submitMove = async () => {
    if (!moveDialog.itemId) return;
    const qty = parseFloat(moveQty || "0");
    if (!qty || !Number.isFinite(qty)) { toast.error("Quantity required."); return; }
    const signedQty = ["sold", "wastage", "transfer", "return"].includes(moveDialog.reason)
      ? -Math.abs(qty)
      : moveDialog.reason === "adjust" ? qty : Math.abs(qty);
    const unit_cost = moveCost ? Math.round(parseFloat(moveCost) * 100) : 0;
    const res = await recordMovement({
      inventory_item_id: moveDialog.itemId,
      reason: moveDialog.reason,
      qty_change: signedQty,
      unit_cost_cents: unit_cost,
      notes: moveNotes.trim() || undefined,
    });
    if (res.ok) {
      toast.success("Movement logged.");
      setMoveDialog({ open: false, itemId: null, reason: "received" });
    } else {
      toast.error(res.error || "Couldn't save movement.");
    }
  };

  const submitItem = async () => {
    if (!draft.name.trim()) { toast.error("Name required."); return; }
    if (editingId) {
      await updateItem(editingId, draft);
      toast.success("Saved.");
    } else {
      const c = await createItem(draft);
      if (c) toast.success(`Added ${c.name}.`);
    }
    setItemDialog(false); setEditingId(null); setDraft(blank());
  };

  const openEdit = (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    setEditingId(id);
    setDraft({
      name: it.name, sku: it.sku, category: it.category, unit: it.unit,
      low_stock_threshold: it.low_stock_threshold, cost_per_unit_cents: it.cost_per_unit_cents,
      default_supplier: it.default_supplier, is_active: it.is_active,
    });
    setItemDialog(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const itemMovements = logDialog.itemId ? movements.filter((m) => m.inventory_item_id === logDialog.itemId) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Items tracked</p>
          <p className="text-2xl font-bold tabular-nums">{totals.active}</p>
          <p className="text-[10px] text-muted-foreground">of {totals.count} total</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Low stock</p>
          <p className={cn("text-2xl font-bold tabular-nums", lowStockItems.length > 0 && "text-destructive")}>
            {lowStockItems.length}
          </p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Stock value</p>
          <p className="text-2xl font-bold tabular-nums">{fmt(totals.value)}</p>
        </CardContent></Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">Low stock</span>
              </div>
              <Button size="sm" variant="default" onClick={openReorderDialog} className="h-7 text-xs gap-1">
                <ClipboardList className="h-3.5 w-3.5" /> Create reorder PO
              </Button>
            </div>
            <ul className="text-sm space-y-1">
              {lowStockItems.map((i) => (
                <li key={i.id} className="flex items-center justify-between">
                  <span>{i.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {fmtQty(i.on_hand_qty, i.unit)} <span className="text-[11px]">/ threshold {fmtQty(i.low_stock_threshold, i.unit)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {varianceRows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-amber-600" /> Variance & wastage <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-normal">last 30d</span></span>
              <span className="text-sm font-bold tabular-nums text-destructive">
                −{fmt(totalCostLostCents)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border/60 text-sm">
              {varianceRows.map((r) => {
                const adjustClass = r.qty_adjust === 0 ? "text-muted-foreground"
                  : r.qty_adjust < 0 ? "text-destructive" : "text-emerald-600";
                return (
                  <li key={r.inventory_item_id} className="flex items-center justify-between py-1.5">
                    <span className="truncate">{r.name}</span>
                    <span className="flex items-center gap-3 shrink-0 text-[12px] tabular-nums">
                      {r.qty_adjust !== 0 && (
                        <span className={adjustClass} title="Stocktake adjustments">
                          adj {r.qty_adjust > 0 ? "+" : ""}{fmtQty(r.qty_adjust, r.unit)}
                        </span>
                      )}
                      {r.qty_wastage !== 0 && (
                        <span className="text-amber-600" title="Recorded wastage">
                          waste {fmtQty(r.qty_wastage, r.unit)}
                        </span>
                      )}
                      <span className="font-semibold text-destructive">−{fmt(r.cost_lost_cents)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Boxes className="h-4 w-4" /> Inventory</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openStocktake} disabled={items.filter((i) => i.is_active).length === 0}>
                <ClipboardList className="h-4 w-4 mr-1" /> Stocktake
              </Button>
              <Button size="sm" onClick={() => { setEditingId(null); setDraft(blank()); setItemDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Item
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No inventory items yet — add beans, milk, cups, syrups to start tracking.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((i) => {
                const lowStock = i.is_active && Number(i.on_hand_qty) <= Number(i.low_stock_threshold);
                return (
                  <li key={i.id} className="py-2.5 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{i.name}</span>
                        {i.sku && <Badge variant="outline" className="text-[10px] font-mono">{i.sku}</Badge>}
                        {i.category && <Badge variant="secondary" className="text-[10px]">{i.category}</Badge>}
                        {!i.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                        {lowStock && <Badge className="text-[10px] bg-destructive/15 text-destructive hover:bg-destructive/15">Low</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {fmt(i.cost_per_unit_cents)} / {i.unit}
                        {i.default_supplier && <span> · {i.default_supplier}</span>}
                      </p>
                    </div>
                    <span className={cn("tabular-nums font-semibold w-24 text-right shrink-0", lowStock && "text-destructive")}>
                      {fmtQty(i.on_hand_qty, i.unit)}
                    </span>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => openMove(i.id, "received")}>
                      <ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Receive
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Wastage" onClick={() => openMove(i.id, "wastage")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Adjust" onClick={() => openMove(i.id, "adjust")}>
                      <Wrench className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="History" onClick={() => setLogDialog({ open: true, itemId: i.id })}>
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Switch checked={i.is_active} onCheckedChange={(v) => updateItem(i.id, { is_active: v })} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Edit" onClick={() => openEdit(i.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete "${i.name}"?`)) removeItem(i.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Item dialog */}
      <Dialog open={reorderDialog} onOpenChange={setReorderDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Reorder low-stock items</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div>
              <Label className="text-xs">Supplier</Label>
              <Select value={reorderSupplier || "none"} onValueChange={(v) => setReorderSupplier(v === "none" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No supplier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No supplier</SelectItem>
                  {suppliers.filter((s) => s.is_active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ul className="divide-y divide-border/60">
              {lowStockItems.map((it) => {
                const state = reorderLines[it.id] ?? { qty: "", selected: false };
                return (
                  <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                    <Switch
                      checked={state.selected}
                      onCheckedChange={(v) => setReorderLines((p) => ({ ...p, [it.id]: { qty: p[it.id]?.qty ?? "0", selected: v } }))}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{it.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        On hand {fmtQty(it.on_hand_qty, it.unit)} · cost {fmt(it.cost_per_unit_cents ?? 0)} / {it.unit}
                      </p>
                    </div>
                    <Input
                      type="number" step="0.01" min="0"
                      value={state.qty}
                      onChange={(e) => setReorderLines((p) => ({ ...p, [it.id]: { qty: e.target.value, selected: p[it.id]?.selected ?? true } }))}
                      className="h-8 w-20 text-right tabular-nums"
                      disabled={!state.selected}
                    />
                    <span className="text-[11px] text-muted-foreground w-8 shrink-0">{it.unit}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReorderDialog(false)} disabled={purchasingSaving}>Cancel</Button>
            <Button onClick={submitReorder} disabled={purchasingSaving}>
              {purchasingSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create draft PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit item" : "New item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Whole milk" />
              </div>
              <div>
                <Label>SKU (optional)</Label>
                <Input value={draft.sku ?? ""} onChange={(e) => setDraft({ ...draft, sku: e.target.value || null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={draft.category ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value || null })} placeholder="Dairy" />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={draft.unit} onValueChange={(v) => setDraft({ ...draft, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Low-stock threshold</Label>
                <Input type="number" step="0.1" min={0} value={draft.low_stock_threshold}
                  onChange={(e) => setDraft({ ...draft, low_stock_threshold: Math.max(0, parseFloat(e.target.value || "0")) })} />
              </div>
              <div>
                <Label>Cost / {draft.unit} ($)</Label>
                <Input type="number" step="0.01" min={0} value={(draft.cost_per_unit_cents / 100).toString()}
                  onChange={(e) => setDraft({ ...draft, cost_per_unit_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
            </div>
            <div>
              <Label>Default supplier (optional)</Label>
              <Input value={draft.default_supplier ?? ""} onChange={(e) => setDraft({ ...draft, default_supplier: e.target.value || null })} placeholder="ABC Coffee Co." />
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Active</span>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={submitItem} disabled={saving}>{editingId ? "Save" : "Add item"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement dialog */}
      <Dialog open={moveDialog.open} onOpenChange={(v) => setMoveDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          <DialogHeader><DialogTitle className="capitalize">{moveDialog.reason} stock</DialogTitle></DialogHeader>
          {(() => {
            const item = moveDialog.itemId ? items.find((x) => x.id === moveDialog.itemId) : null;
            if (!item) return null;
            return (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.name} — on hand <span className="font-semibold tabular-nums text-foreground">{fmtQty(item.on_hand_qty, item.unit)}</span></p>
                <div>
                  <Label>{moveDialog.reason === "adjust" ? "Change (use − for less)" : "Quantity"}</Label>
                  <Input type="number" step="0.01" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder={`0 ${item.unit}`} />
                </div>
                {moveDialog.reason === "received" && (
                  <div>
                    <Label>Unit cost ($) — optional, blends rolling cost</Label>
                    <Input type="number" step="0.01" value={moveCost} onChange={(e) => setMoveCost(e.target.value)} placeholder={(item.cost_per_unit_cents / 100).toFixed(2)} />
                  </div>
                )}
                <div>
                  <Label>Note (optional)</Label>
                  <Input value={moveNotes} onChange={(e) => setMoveNotes(e.target.value)} />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveDialog({ open: false, itemId: null, reason: "received" })}>Cancel</Button>
            <Button onClick={submitMove} disabled={saving}>Save movement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Movement history */}
      <Dialog open={logDialog.open} onOpenChange={(v) => setLogDialog((d) => ({ ...d, open: v }))}>
        <DialogContent>
          {(() => {
            const item = logDialog.itemId ? items.find((x) => x.id === logDialog.itemId) : null;
            if (!item) return null;
            return (
              <>
                <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {item.name} history</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">Last 30 days of stock movements.</p>
                {itemMovements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No movements yet.</p>
                ) : (
                  <ul className="divide-y divide-border/60 max-h-[55vh] overflow-y-auto">
                    {itemMovements.map((m) => (
                      <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] capitalize">{m.reason}</Badge>
                          {m.notes && <span className="text-muted-foreground truncate">{m.notes}</span>}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          <span className={cn("tabular-nums", m.qty_change < 0 ? "text-destructive" : "text-emerald-600")}>
                            {m.qty_change > 0 ? "+" : ""}{Number(m.qty_change).toFixed(2)} {item.unit}
                          </span>
                          <span className="text-[11px] text-muted-foreground tabular-nums">{new Date(m.created_at).toLocaleString()}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Stocktake dialog */}
      <Dialog open={stocktakeOpen} onOpenChange={setStocktakeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Stocktake
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Enter the actual on-hand quantity for each item. Any row that differs from the expected value will create a single <span className="font-semibold text-foreground">adjust</span> stock movement on submit.
            </p>
            <div className="rounded-md border border-border overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-2 py-1.5 bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <span className="col-span-5">Item</span>
                <span className="col-span-2 text-right">Expected</span>
                <span className="col-span-3 text-right">Actual</span>
                <span className="col-span-2 text-right">Δ value</span>
              </div>
              <ul className="divide-y divide-border/40 text-sm">
                {items.filter((i) => i.is_active).map((i) => {
                  const expected = Number(i.on_hand_qty);
                  const actualStr = stocktakeCounts[i.id] ?? "";
                  const actualNum = parseFloat(actualStr);
                  const hasActual = actualStr !== "" && Number.isFinite(actualNum);
                  const delta = hasActual ? actualNum - expected : 0;
                  const dValue = Math.round(delta * i.cost_per_unit_cents);
                  const isVariance = hasActual && Math.abs(delta) >= 0.0005;
                  return (
                    <li key={i.id} className={cn(
                      "grid grid-cols-12 gap-1 px-2 py-1.5 items-center",
                      isVariance && "bg-amber-500/5",
                    )}>
                      <span className="col-span-5 truncate">
                        <span className="font-medium">{i.name}</span>
                        <span className="text-[11px] text-muted-foreground ml-1">{i.unit}</span>
                      </span>
                      <span className="col-span-2 text-right tabular-nums text-muted-foreground">
                        {expected.toFixed(2)}
                      </span>
                      <span className="col-span-3 flex justify-end">
                        <Input
                          type="number" step="0.01" min={0}
                          value={actualStr}
                          onChange={(e) => setStocktakeCounts((p) => ({ ...p, [i.id]: e.target.value }))}
                          className="h-7 w-24 tabular-nums text-right"
                        />
                      </span>
                      <span className={cn(
                        "col-span-2 text-right tabular-nums text-[11px]",
                        !isVariance && "text-muted-foreground",
                        isVariance && dValue < 0 && "text-destructive",
                        isVariance && dValue > 0 && "text-emerald-700 dark:text-emerald-300",
                      )}>
                        {isVariance ? (
                          <>
                            {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                            {i.cost_per_unit_cents > 0 && (
                              <span className="block text-[10px]">
                                {dValue >= 0 ? "+" : "−"}${(Math.abs(dValue) / 100).toFixed(2)}
                              </span>
                            )}
                          </>
                        ) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex items-center justify-between text-sm tabular-nums px-1">
              <span className="text-muted-foreground">
                {stocktakeSummary.variances} variance{stocktakeSummary.variances === 1 ? "" : "s"}
              </span>
              <span className={cn(
                "font-semibold",
                stocktakeSummary.net_cents < 0 && "text-destructive",
                stocktakeSummary.net_cents > 0 && "text-emerald-700 dark:text-emerald-300",
              )}>
                Net Δ value{" "}
                {stocktakeSummary.net_cents >= 0 ? "+" : "−"}${(Math.abs(stocktakeSummary.net_cents) / 100).toFixed(2)}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStocktakeOpen(false)}>Cancel</Button>
            <Button onClick={submitStocktake} disabled={stocktakeSubmitting || stocktakeSummary.variances === 0}>
              {stocktakeSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Save {stocktakeSummary.variances} adjustment{stocktakeSummary.variances === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
