/**
 * CafeBaristasSection — staff roster: add, edit, deactivate.
 * Hourly rate drives payroll; PIN is the till quick-switch ID.
 */
import { useState } from "react";
import { UserCog, Plus, Trash2, Loader2, KeyRound, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCafeBaristas, type CafeBaristaDraft } from "@/hooks/cafe/useCafeBaristas";
import { useCafeBaristaLifetimeTips } from "@/hooks/cafe/useCafeBaristaLifetimeTips";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { toast } from "sonner";

interface Props { storeId: string }
const ROLES = [
  { v: "owner", l: "Owner" }, { v: "manager", l: "Manager" }, { v: "barista", l: "Barista" },
  { v: "kitchen", l: "Kitchen" }, { v: "server", l: "Server" }, { v: "other", l: "Other" },
] as const;

const blank = (): CafeBaristaDraft => ({
  display_name: "",
  role: "barista",
  email: null,
  phone: null,
  photo_url: null,
  hourly_rate_cents: 1500,
  till_pin: null,
  user_id: null,
  specialties: [],
  is_active: true,
  hired_on: new Date().toISOString().slice(0, 10),
});

export default function CafeBaristasSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const { baristas, loading, saving, create, update, remove } = useCafeBaristas(storeId);
  const { byBarista: lifetimeTips } = useCafeBaristaLifetimeTips(storeId);
  const [dialog, setDialog] = useState(false);
  const [draft, setDraft] = useState<CafeBaristaDraft>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!draft.display_name.trim()) { toast.error("Name required."); return; }
    if (draft.till_pin && !/^[0-9]{4,6}$/.test(draft.till_pin)) { toast.error("PIN must be 4–6 digits."); return; }
    if (editingId) {
      await update(editingId, draft);
      toast.success("Saved.");
    } else {
      const c = await create(draft);
      if (c) toast.success(`Added ${c.display_name}.`);
    }
    setDialog(false);
    setEditingId(null);
    setDraft(blank());
  };

  const openEdit = (id: string) => {
    const b = baristas.find((x) => x.id === id);
    if (!b) return;
    setEditingId(id);
    setDraft({
      display_name: b.display_name, role: b.role,
      email: b.email, phone: b.phone, photo_url: b.photo_url,
      hourly_rate_cents: b.hourly_rate_cents, till_pin: b.till_pin,
      user_id: b.user_id, specialties: b.specialties,
      is_active: b.is_active, hired_on: b.hired_on,
    });
    setDialog(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const activeCount = baristas.filter((b) => b.is_active).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total staff</p>
          <p className="text-2xl font-bold tabular-nums">{baristas.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Active</p>
          <p className="text-2xl font-bold tabular-nums">{activeCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg hourly</p>
          <p className="text-2xl font-bold tabular-nums">
            {activeCount > 0
              ? fmt(Math.round(baristas.filter((b) => b.is_active).reduce((s, b) => s + b.hourly_rate_cents, 0) / activeCount))
              : "—"}
          </p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2"><UserCog className="h-4 w-4" /> Baristas & team</span>
            <Button size="sm" onClick={() => { setEditingId(null); setDraft(blank()); setDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add staff
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {baristas.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No staff yet — add your first barista to enable time clock and tips.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {baristas.map((b) => (
                <li key={b.id} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-700 font-bold uppercase overflow-hidden">
                    {b.photo_url ? <img src={b.photo_url} alt="" className="h-full w-full object-cover" /> : b.display_name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{b.display_name}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize">{b.role}</Badge>
                      {b.till_pin && <Badge variant="outline" className="text-[10px] gap-1"><KeyRound className="h-3 w-3" /> PIN</Badge>}
                      {!b.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                      {b.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {b.phone}</span>}
                      {b.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {b.email}</span>}
                      {b.hired_on && <span>Hired {b.hired_on}</span>}
                    </div>
                  </div>
                  {(lifetimeTips.get(b.id) ?? 0) > 0 && (
                    <span
                      className="text-[10px] uppercase tracking-wider font-semibold tabular-nums rounded-md px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0"
                      title="Lifetime tips paid out"
                    >
                      Tips {fmt(lifetimeTips.get(b.id) ?? 0)}
                    </span>
                  )}
                  <span className="tabular-nums text-sm font-medium shrink-0">{fmt(b.hourly_rate_cents)}/hr</span>
                  <Switch checked={b.is_active} onCheckedChange={(v) => update(b.id, { is_active: v })} />
                  <Button size="sm" variant="ghost" onClick={() => openEdit(b.id)}>Edit</Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm(`Remove ${b.display_name}?`)) remove(b.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Edit staff" : "Add staff"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} placeholder="Sokha" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as CafeBaristaDraft["role"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone (optional)</Label>
                <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value || null })} />
              </div>
              <div>
                <Label>Email (optional)</Label>
                <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value || null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hourly rate ($)</Label>
                <Input type="number" step="0.01" min="0" value={(draft.hourly_rate_cents / 100).toString()}
                  onChange={(e) => setDraft({ ...draft, hourly_rate_cents: Math.round(parseFloat(e.target.value || "0") * 100) })} />
              </div>
              <div>
                <Label>Till PIN (4–6 digits)</Label>
                <Input inputMode="numeric" pattern="[0-9]*" value={draft.till_pin ?? ""}
                  onChange={(e) => setDraft({ ...draft, till_pin: e.target.value.replace(/[^0-9]/g, "").slice(0, 6) || null })}
                  placeholder="1234" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hired on</Label>
                <Input type="date" value={draft.hired_on ?? ""} onChange={(e) => setDraft({ ...draft, hired_on: e.target.value || null })} />
              </div>
              <label className="flex items-end justify-between rounded-lg border border-border p-2">
                <span className="text-sm">Active</span>
                <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editingId ? "Save" : "Add staff"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
