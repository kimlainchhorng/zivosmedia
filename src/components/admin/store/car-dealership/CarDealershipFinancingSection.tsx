/**
 * Financing applications section.
 */
import { memo, useState } from "react";
import { Plus, Banknote, Pencil, Trash2, Loader2 } from "lucide-react";
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
  useDealershipFinancing,
  type DealershipFinancing,
  type DealershipFinancingDraft,
  type DealershipFinancingStatus,
} from "@/hooks/car-dealership/useDealershipFinancing";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  return cleaned ? Math.round(parseFloat(cleaned) * 100) : 0;
};
const toDollars = (cents: number) => (cents / 100).toString();

const formatApr = (bps: number) => `${(bps / 100).toFixed(2)}%`;

const statusStyles: Record<DealershipFinancingStatus, string> = {
  draft: "bg-zinc-500/15 text-zinc-700",
  submitted: "bg-blue-500/15 text-blue-700",
  approved: "bg-emerald-500/15 text-emerald-700",
  conditionally_approved: "bg-amber-500/15 text-amber-700",
  declined: "bg-red-500/15 text-red-700",
  funded: "bg-emerald-600/15 text-emerald-800",
  cancelled: "bg-orange-500/15 text-orange-700",
};

const emptyDraft = (): DealershipFinancingDraft => ({
  sale_id: null,
  customer_id: null,
  lender_name: null,
  application_number: null,
  amount_financed_cents: 0,
  down_payment_cents: 0,
  apr_bps: 0,
  term_months: 60,
  monthly_payment_cents: 0,
  first_payment_due: null,
  payment_frequency: "monthly",
  status: "draft",
  submitted_at: null,
  decision_at: null,
  funded_at: null,
  decision_notes: null,
});

interface Props { storeId: string; }

function CarDealershipFinancingSectionInner({ storeId }: Props) {
  const { financings, loading, saving, create, update, remove } = useDealershipFinancing(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipFinancing | null>(null);
  const [draft, setDraft] = useState<DealershipFinancingDraft>(emptyDraft());

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (f: DealershipFinancing) => {
    setEditing(f);
    const { id, store_id, created_at, updated_at, ...rest } = f;
    setDraft(rest);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (draft.amount_financed_cents <= 0) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Application updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Application added."); setDialogOpen(false); }
      else toast.error("Couldn't create.");
    }
  };

  const handleDelete = async (f: DealershipFinancing) => {
    if (!window.confirm(`Delete application?`)) return;
    const ok = await remove(f.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Financing</h2>
          <p className="text-sm text-muted-foreground">
            {financings.length} applications · {financings.filter((f) => f.status === "funded").length} funded
          </p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New application</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : financings.length === 0 ? (
        <Card className="p-10 text-center">
          <Banknote className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No financing applications yet</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />New application</Button>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {financings.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{f.lender_name || "Unspecified lender"}</p>
                    <Badge className={cn("border-0 text-[10px]", statusStyles[f.status])}>{f.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{f.term_months} mo</span>
                    <span>{formatApr(f.apr_bps)} APR</span>
                    {f.application_number && <span>#{f.application_number}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{formatPrice(f.amount_financed_cents)}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(f.monthly_payment_cents)}/mo</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(f)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit financing" : "New financing application"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lender name</Label>
                <Input value={draft.lender_name ?? ""} onChange={(e) => setDraft({ ...draft, lender_name: e.target.value || null })} placeholder="Bank of America" />
              </div>
              <div className="space-y-1.5">
                <Label>Application #</Label>
                <Input value={draft.application_number ?? ""} onChange={(e) => setDraft({ ...draft, application_number: e.target.value || null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount financed ($)</Label>
                <Input inputMode="decimal" value={toDollars(draft.amount_financed_cents)} onChange={(e) => setDraft({ ...draft, amount_financed_cents: fromDollars(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Down payment ($)</Label>
                <Input inputMode="decimal" value={toDollars(draft.down_payment_cents)} onChange={(e) => setDraft({ ...draft, down_payment_cents: fromDollars(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>APR (%)</Label>
                <Input
                  inputMode="decimal"
                  value={(draft.apr_bps / 100).toString()}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(/[^\d.]/g, ""));
                    setDraft({ ...draft, apr_bps: isNaN(v) ? 0 : Math.round(v * 100) });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Term (mo)</Label>
                <Input type="number" value={draft.term_months} onChange={(e) => setDraft({ ...draft, term_months: parseInt(e.target.value, 10) || 60 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly ($)</Label>
                <Input inputMode="decimal" value={toDollars(draft.monthly_payment_cents)} onChange={(e) => setDraft({ ...draft, monthly_payment_cents: fromDollars(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as DealershipFinancingStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="conditionally_approved">Conditionally approved</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="funded">Funded</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>First payment due</Label>
                <Input type="date" value={draft.first_payment_due ?? ""} onChange={(e) => setDraft({ ...draft, first_payment_due: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Decision notes</Label>
              <Textarea rows={2} value={draft.decision_notes ?? ""} onChange={(e) => setDraft({ ...draft, decision_notes: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || draft.amount_financed_cents <= 0}>
              {saving ? "Saving..." : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipFinancingSection = memo(CarDealershipFinancingSectionInner);
export default CarDealershipFinancingSection;
