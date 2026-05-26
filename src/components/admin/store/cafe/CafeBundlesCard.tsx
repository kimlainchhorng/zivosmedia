/**
 * CafeBundlesCard — combo/bundle management embedded inside the menu section.
 * Owner picks N menu items + a bundle price; the card shows the "saves $X"
 * difference vs the sum of the item prices so they don't accidentally
 * configure a money-losing bundle.
 */
import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeBundles, type CafeBundleDraft } from "@/hooks/cafe/useCafeBundles";
import { useCafeMenu } from "@/hooks/cafe/useCafeMenu";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";

interface Props { storeId: string }

const blankDraft = (): CafeBundleDraft => ({
  name: "", description: null, image_url: null,
  price_cents: 0, is_active: true,
  active_start_time: null, active_end_time: null,
  items: [],
});

// "14:30:00" → "14:30" for <input type="time">; null stays "".
const toInputTime = (v: string | null) => (v ? v.slice(0, 5) : "");
// "14:30" → "14:30:00"; "" → null.
const fromInputTime = (v: string) => (v ? `${v}:00` : null);

// Friendly inline label: "11:30 AM – 2:30 PM".
const fmtWindow = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const pretty = (t: string) => {
    const [hh, mm] = t.split(":");
    const h = parseInt(hh, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${mm} ${ampm}`;
  };
  return `${pretty(start)} – ${pretty(end)}`;
};

export default function CafeBundlesCard({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const { bundles, itemsByBundle, loading, saving, create, update, remove } = useCafeBundles(storeId);
  const { items: menuItems } = useCafeMenu(storeId);
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CafeBundleDraft>(blankDraft());
  const [priceInput, setPriceInput] = useState("");

  const menuMap = useMemo(() => new Map(menuItems.map((m) => [m.id, m])), [menuItems]);

  // Sync the price text input to the draft cents value when opening edit.
  useEffect(() => {
    setPriceInput(draft.price_cents > 0 ? (draft.price_cents / 100).toString() : "");
  }, [draft.price_cents]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(blankDraft());
    setDialog(true);
  };

  const openEdit = (id: string) => {
    const b = bundles.find((x) => x.id === id);
    if (!b) return;
    const lines = itemsByBundle.get(id) ?? [];
    setEditingId(id);
    setDraft({
      name: b.name,
      description: b.description,
      image_url: b.image_url,
      price_cents: b.price_cents,
      is_active: b.is_active,
      active_start_time: b.active_start_time,
      active_end_time: b.active_end_time,
      items: lines.map((l) => ({ menu_item_id: l.menu_item_id, quantity: l.quantity })),
    });
    setDialog(true);
  };

  const sumOfItems = useMemo(() => {
    return draft.items.reduce((sum, line) => {
      const m = menuMap.get(line.menu_item_id);
      return sum + (m?.price_cents ?? 0) * line.quantity;
    }, 0);
  }, [draft.items, menuMap]);

  const savings = sumOfItems - draft.price_cents;

  const handleSave = async () => {
    if (!draft.name.trim()) { toast.error("Name required."); return; }
    if (draft.items.length === 0) { toast.error("Add at least one item to the bundle."); return; }
    // Time window: both or neither, and they must differ.
    const startSet = !!draft.active_start_time;
    const endSet = !!draft.active_end_time;
    if (startSet !== endSet) {
      toast.error("Set both start and end times, or leave both blank for always-on.");
      return;
    }
    if (startSet && endSet && draft.active_start_time === draft.active_end_time) {
      toast.error("Start and end times can't be the same.");
      return;
    }
    const cents = Math.round(parseFloat(priceInput || "0") * 100);
    const next = { ...draft, price_cents: Math.max(0, cents) };
    const ok = editingId ? await update(editingId, next) : await create(next);
    if (ok) {
      toast.success(editingId ? "Bundle saved." : "Bundle created.");
      setDialog(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Package className="h-4 w-4 text-rose-600" /> Bundles & combos</span>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Bundle
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : bundles.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No bundles yet. Combine menu items into a fixed-price combo (e.g. "Coffee + Croissant for $6").
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {bundles.map((b) => {
              const lines = itemsByBundle.get(b.id) ?? [];
              const sum = lines.reduce((s, l) => s + ((menuMap.get(l.menu_item_id)?.price_cents ?? 0) * l.quantity), 0);
              const saves = sum - b.price_cents;
              return (
                <li key={b.id} className="py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{b.name}</span>
                      {!b.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                      {saves > 0 && (
                        <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">
                          Save {fmt(saves)}
                        </Badge>
                      )}
                      {fmtWindow(b.active_start_time, b.active_end_time) && (
                        <Badge variant="outline" className="text-[10px]">
                          {fmtWindow(b.active_start_time, b.active_end_time)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {lines.length === 0
                        ? "No items"
                        : lines.map((l) => `${l.quantity}× ${menuMap.get(l.menu_item_id)?.name ?? "?"}`).join(" · ")}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums shrink-0">{fmt(b.price_cents)}</span>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(b.id)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => { if (confirm(`Delete bundle "${b.name}"?`)) void remove(b.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit bundle" : "New bundle"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Coffee + Croissant Combo"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Your morning, sorted."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Bundle price ($)</Label>
                <Input
                  type="number" step="0.01" min="0"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="6.00"
                />
              </div>
              <label className="flex items-end justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Active</span>
                <Switch
                  checked={draft.is_active}
                  onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
                />
              </label>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Available hours</Label>
                {(draft.active_start_time || draft.active_end_time) && (
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground hover:text-foreground underline"
                    onClick={() => setDraft({ ...draft, active_start_time: null, active_end_time: null })}
                  >
                    Clear (always on)
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">From</Label>
                  <Input
                    type="time"
                    value={toInputTime(draft.active_start_time)}
                    onChange={(e) => setDraft({ ...draft, active_start_time: fromInputTime(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <Input
                    type="time"
                    value={toInputTime(draft.active_end_time)}
                    onChange={(e) => setDraft({ ...draft, active_end_time: fromInputTime(e.target.value) })}
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Leave blank to show all day. End before start wraps past midnight (e.g. 10pm – 2am).
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Bundle items</Label>
                {sumOfItems > 0 && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Items total {fmt(sumOfItems)} · {savings >= 0 ? `saves ${fmt(savings)}` : <span className="text-destructive">loses {fmt(-savings)}</span>}
                  </span>
                )}
              </div>
              {draft.items.length === 0 ? (
                <p className="text-[12px] text-muted-foreground py-1">No items yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {draft.items.map((line, idx) => {
                    const m = menuMap.get(line.menu_item_id);
                    return (
                      <li key={idx} className="flex items-center gap-2">
                        <Select
                          value={line.menu_item_id}
                          onValueChange={(v) => setDraft({
                            ...draft,
                            items: draft.items.map((x, i) => i === idx ? { ...x, menu_item_id: v } : x),
                          })}
                        >
                          <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {menuItems.filter((mi) => mi.is_active).map((mi) => (
                              <SelectItem key={mi.id} value={mi.id}>{mi.name} · {fmt(mi.price_cents)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min="1" max="20"
                          className="h-8 w-16 text-center"
                          value={line.quantity}
                          onChange={(e) => setDraft({
                            ...draft,
                            items: draft.items.map((x, i) => i === idx ? { ...x, quantity: Math.max(1, parseInt(e.target.value || "1", 10)) } : x),
                          })}
                        />
                        <span className="text-[11px] text-muted-foreground tabular-nums w-16 text-right">
                          {fmt((m?.price_cents ?? 0) * line.quantity)}
                        </span>
                        <Button
                          size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                size="sm" variant="outline" className="h-7 text-xs gap-1"
                onClick={() => {
                  const firstActive = menuItems.find((m) => m.is_active);
                  if (!firstActive) { toast.error("Add menu items first."); return; }
                  setDraft({ ...draft, items: [...draft.items, { menu_item_id: firstActive.id, quantity: 1 }] });
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingId ? "Save bundle" : "Create bundle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
