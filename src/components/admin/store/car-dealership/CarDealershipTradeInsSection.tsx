/**
 * Trade-in appraisals section.
 */
import { memo, useState } from "react";
import { Plus, Repeat, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipTradeIns,
  type DealershipTradeIn,
  type DealershipTradeInDraft,
  type DealershipTradeInStatus,
  type DealershipTradeInCondition,
} from "@/hooks/car-dealership/useDealershipTradeIns";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  return cleaned ? Math.round(parseFloat(cleaned) * 100) : 0;
};
const toDollars = (cents: number) => (cents / 100).toString();

const statusStyles: Record<DealershipTradeInStatus, string> = {
  appraised: "bg-blue-500/15 text-blue-700",
  offered: "bg-amber-500/15 text-amber-700",
  accepted: "bg-emerald-500/15 text-emerald-700",
  declined: "bg-red-500/15 text-red-700",
  completed: "bg-emerald-600/15 text-emerald-800",
};

const emptyDraft = (): DealershipTradeInDraft => ({
  sale_id: null,
  customer_id: null,
  appraiser_user_id: null,
  make: "",
  model: "",
  year: new Date().getFullYear(),
  trim: null,
  vin: null,
  license_plate: null,
  mileage: null,
  color: null,
  condition: null,
  appraised_value_cents: 0,
  offered_value_cents: 0,
  payoff_amount_cents: 0,
  payoff_lender: null,
  notes: null,
  photo_urls: [],
  status: "appraised",
});

interface Props { storeId: string; }

function CarDealershipTradeInsSectionInner({ storeId }: Props) {
  const { tradeIns, loading, saving, create, update, remove } = useDealershipTradeIns(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipTradeIn | null>(null);
  const [draft, setDraft] = useState<DealershipTradeInDraft>(emptyDraft());

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (t: DealershipTradeIn) => {
    setEditing(t);
    const { id, store_id, created_at, updated_at, ...rest } = t;
    setDraft(rest);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!draft.make.trim() || !draft.model.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Trade-in updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Trade-in added."); setDialogOpen(false); }
      else toast.error("Couldn't add.");
    }
  };

  const handleDelete = async (t: DealershipTradeIn) => {
    if (!window.confirm(`Delete trade-in for ${t.year ?? ""} ${t.make} ${t.model}?`)) return;
    const ok = await remove(t.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Trade-ins</h2>
          <p className="text-sm text-muted-foreground">{tradeIns.length} appraisals</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New appraisal</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tradeIns.length === 0 ? (
        <Card className="p-10 text-center">
          <Repeat className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No trade-ins yet</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />New appraisal</Button>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {tradeIns.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{t.year ?? ""} {t.make} {t.model}</p>
                    <Badge className={cn("border-0 text-[10px]", statusStyles[t.status])}>{t.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {t.mileage != null && <span>{t.mileage.toLocaleString()} mi</span>}
                    {t.condition && <span>· {t.condition}</span>}
                    {t.payoff_amount_cents > 0 && (
                      <span>· Payoff {formatPrice(t.payoff_amount_cents)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{formatPrice(t.offered_value_cents || t.appraised_value_cents)}</p>
                  {t.offered_value_cents > 0 && t.appraised_value_cents !== t.offered_value_cents && (
                    <p className="text-xs text-muted-foreground">Appr. {formatPrice(t.appraised_value_cents)}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit trade-in" : "New trade-in appraisal"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: e.target.value ? parseInt(e.target.value, 10) : null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Make *</Label>
                <Input value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Model *</Label>
                <Input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>VIN</Label>
                <Input className="font-mono" value={draft.vin ?? ""} onChange={(e) => setDraft({ ...draft, vin: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mileage</Label>
                <Input type="number" value={draft.mileage ?? 0} onChange={(e) => setDraft({ ...draft, mileage: e.target.value ? parseInt(e.target.value, 10) : null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select
                  value={draft.condition ?? "_none"}
                  onValueChange={(v) => setDraft({ ...draft, condition: v === "_none" ? null : (v as DealershipTradeInCondition) })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="salvage">Salvage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as DealershipTradeInStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appraised">Appraised</SelectItem>
                    <SelectItem value="offered">Offered</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Appraised value ($)</Label>
                <Input inputMode="decimal" value={toDollars(draft.appraised_value_cents)} onChange={(e) => setDraft({ ...draft, appraised_value_cents: fromDollars(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Offered value ($)</Label>
                <Input inputMode="decimal" value={toDollars(draft.offered_value_cents)} onChange={(e) => setDraft({ ...draft, offered_value_cents: fromDollars(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payoff amount ($)</Label>
                <Input inputMode="decimal" value={toDollars(draft.payoff_amount_cents)} onChange={(e) => setDraft({ ...draft, payoff_amount_cents: fromDollars(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payoff lender</Label>
                <Input value={draft.payoff_lender ?? ""} onChange={(e) => setDraft({ ...draft, payoff_lender: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.make.trim() || !draft.model.trim()}>
              {saving ? "Saving..." : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipTradeInsSection = memo(CarDealershipTradeInsSectionInner);
export default CarDealershipTradeInsSection;
