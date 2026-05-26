/**
 * CafeRecipesSection — for each menu item, list the ingredients (with
 * quantity-per-serving and rolled-up cost). Pick from existing inventory.
 */
import { useMemo, useState } from "react";
import { Soup, Plus, Loader2, Trash2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeMenu } from "@/hooks/cafe/useCafeMenu";
import { useCafeInventory } from "@/hooks/cafe/useCafeInventory";
import { useCafeRecipes } from "@/hooks/cafe/useCafeRecipes";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

export default function CafeRecipesSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const menu = useCafeMenu(storeId);
  const inv = useCafeInventory(storeId);
  const recipes = useCafeRecipes(storeId);

  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [addDialog, setAddDialog] = useState(false);
  const [pickInventoryId, setPickInventoryId] = useState("");
  const [pickQty, setPickQty] = useState("");
  const [pickNote, setPickNote] = useState("");

  const activeMenu = useMemo(() => menu.items.filter((m) => m.is_active), [menu.items]);
  const current = selectedMenuId ?? activeMenu[0]?.id ?? null;
  const currentItem = current ? menu.items.find((m) => m.id === current) : null;
  const currentRecipes = current ? (recipes.byMenuItem[current] ?? []) : [];

  // Roll-up cost: sum(quantity_per_serving × inventory.cost_per_unit_cents).
  const costPerServing = useMemo(() => {
    let cents = 0;
    for (const r of currentRecipes) {
      const ing = inv.items.find((i) => i.id === r.inventory_item_id);
      if (!ing) continue;
      cents += Number(r.quantity_per_serving) * ing.cost_per_unit_cents;
    }
    return Math.round(cents);
  }, [currentRecipes, inv.items]);

  const margin = currentItem ? currentItem.price_cents - costPerServing : 0;
  const marginPct = currentItem && currentItem.price_cents > 0 ? Math.round((margin / currentItem.price_cents) * 100) : 0;

  const availableInventory = useMemo(() => {
    const usedIds = new Set(currentRecipes.map((r) => r.inventory_item_id));
    return inv.items.filter((i) => i.is_active && !usedIds.has(i.id));
  }, [currentRecipes, inv.items]);

  const submitAdd = async () => {
    if (!current || !pickInventoryId) return;
    const qty = parseFloat(pickQty || "0");
    if (!qty || qty <= 0) { toast.error("Quantity required."); return; }
    const r = await recipes.addIngredient(current, pickInventoryId, qty, pickNote);
    if (r) {
      toast.success("Added.");
      setAddDialog(false);
      setPickInventoryId(""); setPickQty(""); setPickNote("");
    }
  };

  if (menu.loading || inv.loading || recipes.loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (activeMenu.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Add menu items first — see Menu & Categories.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Soup className="h-4 w-4" /> Menu item</span>
            <Select value={current ?? ""} onValueChange={setSelectedMenuId}>
              <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {activeMenu.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        {currentItem && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sells for</p>
                <p className="text-xl font-bold tabular-nums">{fmt(currentItem.price_cents)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ingredient cost</p>
                <p className="text-xl font-bold tabular-nums">{fmt(costPerServing)}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Margin</p>
                <p className={cn("text-xl font-bold tabular-nums", margin < 0 && "text-destructive")}>
                  {fmt(margin)} <span className="text-[11px] font-normal text-muted-foreground">({marginPct}%)</span>
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span>Ingredients</span>
            <Button size="sm" onClick={() => setAddDialog(true)} disabled={availableInventory.length === 0}>
              <Plus className="h-4 w-4 mr-1" /> Ingredient
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {availableInventory.length === 0 && currentRecipes.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No inventory items yet — add some in the Inventory tab first.
            </div>
          )}
          {currentRecipes.length === 0 && availableInventory.length > 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">No ingredients yet — add the first one.</div>
          )}
          {currentRecipes.length > 0 && (
            <ul className="divide-y divide-border/60">
              {currentRecipes.map((r) => {
                const ing = inv.items.find((i) => i.id === r.inventory_item_id);
                const lineCost = ing ? Number(r.quantity_per_serving) * ing.cost_per_unit_cents : 0;
                return (
                  <li key={r.id} className="py-2.5 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{ing?.name ?? "(deleted)"}</span>
                        {ing && <Badge variant="outline" className="text-[10px]">{ing.unit}</Badge>}
                      </div>
                      {r.note && <p className="text-[11px] text-muted-foreground">{r.note}</p>}
                    </div>
                    <Input
                      type="number" step="0.001" min={0}
                      value={String(r.quantity_per_serving)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value || "0");
                        if (v > 0) void recipes.setQuantity(r.id, v);
                      }}
                      className="h-8 w-24 tabular-nums"
                    />
                    {ing && <span className="text-[11px] text-muted-foreground tabular-nums w-20 text-right">{fmt(Math.round(lineCost))}</span>}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Remove this ingredient?")) recipes.removeIngredient(r.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add ingredient</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Inventory item</Label>
              <Select value={pickInventoryId} onValueChange={setPickInventoryId}>
                <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
                <SelectContent>
                  {availableInventory.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity per serving</Label>
              <Input type="number" step="0.001" min="0" value={pickQty} onChange={(e) => setPickQty(e.target.value)} placeholder="0.018" />
              <p className="text-[11px] text-muted-foreground mt-1">e.g. 0.018 kg of beans = 18g</p>
            </div>
            <div>
              <Label>Note (optional)</Label>
              <Input value={pickNote} onChange={(e) => setPickNote(e.target.value)} placeholder="Double shot, decaf, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={submitAdd} disabled={recipes.saving}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
