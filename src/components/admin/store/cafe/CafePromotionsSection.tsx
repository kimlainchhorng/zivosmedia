/**
 * CafePromotionsSection — CRUD for time-windowed % / fixed-cent promos.
 */
import { useState } from "react";
import { Tag, Plus, Trash2, Loader2, Percent, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafePromotions, type CafePromotionDraft, type CafePromoKind } from "@/hooks/cafe/useCafePromotions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const blank = (): CafePromotionDraft => ({
  name: "",
  description: null,
  kind: "percent",
  amount: 10,
  code: null,
  start_at: null,
  end_at: null,
  weekdays: [],
  hour_start: null,
  hour_end: null,
  min_subtotal_cents: 0,
  max_redemptions: null,
  is_active: true,
});

export default function CafePromotionsSection({ storeId }: Props) {
  const { promotions, loading, saving, create, update, remove } = useCafePromotions(storeId);
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState<CafePromotionDraft>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!draft.name.trim()) { toast.error("Name required."); return; }
    if (draft.kind === "percent" && (draft.amount < 1 || draft.amount > 100)) { toast.error("Percent must be 1–100."); return; }
    if (draft.kind === "fixed_cents" && draft.amount <= 0) { toast.error("Amount must be positive."); return; }
    if (editingId) {
      await update(editingId, draft);
      toast.success("Saved.");
    } else {
      const c = await create(draft);
      if (c) toast.success(`Added "${c.name}".`);
    }
    setDialog(false); setEditingId(null); setDraft(blank());
  };

  const openEdit = (id: string) => {
    const p = promotions.find((x) => x.id === id);
    if (!p) return;
    setEditingId(id);
    setDraft({
      name: p.name, description: p.description, kind: p.kind, amount: p.amount,
      code: p.code, start_at: p.start_at, end_at: p.end_at,
      weekdays: p.weekdays, hour_start: p.hour_start, hour_end: p.hour_end,
      min_subtotal_cents: p.min_subtotal_cents, max_redemptions: p.max_redemptions,
      is_active: p.is_active,
    });
    setDialog(true);
  };

  const toggleWeekday = (n: number) => {
    setDraft((d) => ({ ...d, weekdays: d.weekdays.includes(n) ? d.weekdays.filter((x) => x !== n) : [...d.weekdays, n].sort() }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><Tag className="h-4 w-4" /> Promotions</span>
            <Button size="sm" onClick={() => { setEditingId(null); setDraft(blank()); setDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New promo
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {promotions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No promotions yet — happy hour, BOGO, weekday discounts will land here.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {promotions.map((p) => (
                <li key={p.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700">
                    {p.kind === "percent" ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{p.name}</span>
                      {p.code && <Badge variant="outline" className="text-[10px] font-mono">{p.code}</Badge>}
                      {!p.is_active && <Badge variant="secondary" className="text-[10px]">Off</Badge>}
                      {p.end_at && new Date(p.end_at) < new Date() && <Badge variant="secondary" className="text-[10px]">Expired</Badge>}
                    </div>
                    {p.description && <p className="text-[12px] text-muted-foreground truncate">{p.description}</p>}
                    <div className="text-[11px] text-muted-foreground space-x-2">
                      <span>{p.kind === "percent" ? `${p.amount}% off` : `${fmt(p.amount)} off`}</span>
                      {p.min_subtotal_cents > 0 && <span>· min {fmt(p.min_subtotal_cents)}</span>}
                      {p.weekdays.length > 0 && <span>· {p.weekdays.map((d) => WEEKDAYS[d]).join(" ")}</span>}
                      {(p.hour_start != null || p.hour_end != null) && <span>· {p.hour_start ?? 0}:00–{p.hour_end ?? 23}:00</span>}
                      {p.max_redemptions != null && <span>· {p.redemption_count}/{p.max_redemptions} used</span>}
                    </div>
                  </div>
                  <Switch checked={p.is_active} onCheckedChange={(v) => update(p.id, { is_active: v })} />
                  <Button size="sm" variant="ghost" onClick={() => openEdit(p.id)}>Edit</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Delete "${p.name}"?`)) remove(p.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Edit promotion" : "New promotion"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Happy Hour 10% off" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value || null })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kind</Label>
                <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as CafePromoKind, amount: v === "percent" ? 10 : 100 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="fixed_cents">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{draft.kind === "percent" ? "Percent" : "Amount ($)"}</Label>
                {draft.kind === "percent" ? (
                  <Input type="number" min={1} max={100} value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: Math.max(1, Math.min(100, parseInt(e.target.value || "0", 10))) })} />
                ) : (
                  <Input type="number" step="0.01" min="0" value={(draft.amount / 100).toString()}
                    onChange={(e) => setDraft({ ...draft, amount: Math.round(parseFloat(e.target.value || "0") * 100) })} />
                )}
              </div>
            </div>
            <div>
              <Label>Code (optional — auto-applies when empty)</Label>
              <Input value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() || null })} placeholder="HAPPY10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts</Label>
                <Input type="datetime-local" value={draft.start_at ? draft.start_at.slice(0, 16) : ""}
                  onChange={(e) => setDraft({ ...draft, start_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
              <div>
                <Label>Ends</Label>
                <Input type="datetime-local" value={draft.end_at ? draft.end_at.slice(0, 16) : ""}
                  onChange={(e) => setDraft({ ...draft, end_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </div>
            <div>
              <Label>Days of week (empty = every day)</Label>
              <div className="flex gap-1 flex-wrap mt-1">
                {WEEKDAYS.map((d, idx) => {
                  const on = draft.weekdays.includes(idx);
                  return (
                    <button key={d} type="button" onClick={() => toggleWeekday(idx)} className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted",
                    )}>{d}</button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hour start (0–23)</Label>
                <Input type="number" min={0} max={23} value={draft.hour_start ?? ""}
                  onChange={(e) => setDraft({ ...draft, hour_start: e.target.value === "" ? null : Math.max(0, Math.min(23, parseInt(e.target.value, 10))) })} />
              </div>
              <div>
                <Label>Hour end (0–23)</Label>
                <Input type="number" min={0} max={23} value={draft.hour_end ?? ""}
                  onChange={(e) => setDraft({ ...draft, hour_end: e.target.value === "" ? null : Math.max(0, Math.min(23, parseInt(e.target.value, 10))) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min subtotal ($)</Label>
                <Input type="number" step="0.01" min="0" value={(draft.min_subtotal_cents / 100).toString()}
                  onChange={(e) => setDraft({ ...draft, min_subtotal_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div>
                <Label>Max redemptions</Label>
                <Input type="number" min={1} value={draft.max_redemptions ?? ""}
                  onChange={(e) => setDraft({ ...draft, max_redemptions: e.target.value === "" ? null : Math.max(1, parseInt(e.target.value, 10)) })}
                  placeholder="∞" />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-lg border border-border p-2">
              <span className="text-sm">Active</span>
              <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editingId ? "Save" : "Add promo"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
