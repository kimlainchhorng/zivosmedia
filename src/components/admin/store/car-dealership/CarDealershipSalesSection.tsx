/**
 * Sales / deals section — list of deals + create / edit dialog.
 */
import { memo, useMemo, useState, useEffect } from "react";
import { Plus, FileSignature, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipSales,
  type DealershipSale,
  type DealershipSaleStatus,
  type DealershipSaleDraft,
} from "@/hooks/car-dealership/useDealershipSales";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  return Math.round(parseFloat(cleaned) * 100);
};
const toDollars = (cents: number) => (cents / 100).toString();

const statusStyles: Record<DealershipSaleStatus, string> = {
  quote: "bg-zinc-500/15 text-zinc-700",
  pending: "bg-blue-500/15 text-blue-700",
  deposit_paid: "bg-amber-500/15 text-amber-700",
  financing: "bg-violet-500/15 text-violet-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  delivered: "bg-emerald-600/15 text-emerald-800",
  cancelled: "bg-red-500/15 text-red-700",
  refunded: "bg-orange-500/15 text-orange-700",
};

const emptyDraft = (): DealershipSaleDraft => ({
  vehicle_id: null,
  customer_id: null,
  lead_id: null,
  salesperson_user_id: null,
  vehicle_label: "",
  vehicle_vin: null,
  customer_name: "",
  customer_phone: null,
  customer_email: null,
  salesperson_name: null,
  sale_price_cents: 0,
  trade_in_value_cents: 0,
  trade_in_payoff_cents: 0,
  rebate_cents: 0,
  doc_fee_cents: 0,
  registration_fee_cents: 0,
  title_fee_cents: 0,
  other_fees_cents: 0,
  taxes_cents: 0,
  discount_cents: 0,
  warranty_cents: 0,
  gap_insurance_cents: 0,
  deposit_cents: 0,
  amount_paid_cents: 0,
  status: "quote",
  payment_method: null,
  sold_at: null,
  delivered_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  customer_notes: null,
  internal_notes: null,
});

interface Props { storeId: string; }

function CarDealershipSalesSectionInner({ storeId }: Props) {
  const { sales, loading, saving, create, update, remove } = useDealershipSales(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipSale | null>(null);
  const [draft, setDraft] = useState<DealershipSaleDraft>(emptyDraft());

  useEffect(() => {
    if (editing) {
      const { id, store_id, deal_number, subtotal_cents, total_cents, balance_due_cents, created_at, updated_at, ...rest } = editing;
      setDraft(rest);
    }
  }, [editing]);

  const computed = useMemo(() => {
    const subtotal = Math.max(0,
      draft.sale_price_cents + draft.doc_fee_cents + draft.registration_fee_cents
      + draft.title_fee_cents + draft.other_fees_cents + draft.warranty_cents + draft.gap_insurance_cents
      - draft.discount_cents - draft.rebate_cents);
    const total = Math.max(0, subtotal + draft.taxes_cents - (draft.trade_in_value_cents - draft.trade_in_payoff_cents));
    const balance = total - draft.amount_paid_cents;
    return { subtotal, total, balance };
  }, [draft]);

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (s: DealershipSale) => { setEditing(s); setDialogOpen(true); };

  const submit = async () => {
    if (!draft.customer_name.trim() || !draft.vehicle_label.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Deal updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Deal created."); setDialogOpen(false); }
      else toast.error("Couldn't create deal.");
    }
  };

  const handleDelete = async (s: DealershipSale) => {
    if (!window.confirm(`Delete deal #${s.deal_number}?`)) return;
    const ok = await remove(s.id);
    if (ok) toast.success("Deal removed.");
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Sales & Deals</h2>
          <p className="text-sm text-muted-foreground">{sales.length} deals · {sales.filter((s) => ["completed", "delivered"].includes(s.status)).length} closed</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New deal</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : sales.length === 0 ? (
        <Card className="p-10 text-center">
          <FileSignature className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">No deals yet</p>
          <Button onClick={openAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />New deal</Button>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {sales.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{s.customer_name}</p>
                    <Badge className={cn("border-0 text-[10px]", statusStyles[s.status])}>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    #{s.deal_number} · {s.vehicle_label}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{formatPrice(s.total_cents)}</p>
                  {s.balance_due_cents > 0 && (
                    <p className="text-xs text-amber-700">Balance: {formatPrice(s.balance_due_cents)}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(s)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit deal #${editing.deal_number}` : "New deal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer name *</Label>
                <Input value={draft.customer_name} onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Customer phone</Label>
                <Input value={draft.customer_phone ?? ""} onChange={(e) => setDraft({ ...draft, customer_phone: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle *</Label>
              <Input value={draft.vehicle_label} onChange={(e) => setDraft({ ...draft, vehicle_label: e.target.value })} placeholder="2023 Toyota Camry SE" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>VIN</Label>
                <Input className="font-mono" value={draft.vehicle_vin ?? ""} onChange={(e) => setDraft({ ...draft, vehicle_vin: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Salesperson</Label>
                <Input value={draft.salesperson_name ?? ""} onChange={(e) => setDraft({ ...draft, salesperson_name: e.target.value || null })} />
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pricing breakdown</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Sale price</Label>
                  <Input inputMode="decimal" value={toDollars(draft.sale_price_cents)} onChange={(e) => setDraft({ ...draft, sale_price_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trade-in value</Label>
                  <Input inputMode="decimal" value={toDollars(draft.trade_in_value_cents)} onChange={(e) => setDraft({ ...draft, trade_in_value_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Trade payoff</Label>
                  <Input inputMode="decimal" value={toDollars(draft.trade_in_payoff_cents)} onChange={(e) => setDraft({ ...draft, trade_in_payoff_cents: fromDollars(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rebate</Label>
                  <Input inputMode="decimal" value={toDollars(draft.rebate_cents)} onChange={(e) => setDraft({ ...draft, rebate_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Discount</Label>
                  <Input inputMode="decimal" value={toDollars(draft.discount_cents)} onChange={(e) => setDraft({ ...draft, discount_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Doc fee</Label>
                  <Input inputMode="decimal" value={toDollars(draft.doc_fee_cents)} onChange={(e) => setDraft({ ...draft, doc_fee_cents: fromDollars(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Reg fee</Label>
                  <Input inputMode="decimal" value={toDollars(draft.registration_fee_cents)} onChange={(e) => setDraft({ ...draft, registration_fee_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Title fee</Label>
                  <Input inputMode="decimal" value={toDollars(draft.title_fee_cents)} onChange={(e) => setDraft({ ...draft, title_fee_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Other fees</Label>
                  <Input inputMode="decimal" value={toDollars(draft.other_fees_cents)} onChange={(e) => setDraft({ ...draft, other_fees_cents: fromDollars(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Warranty</Label>
                  <Input inputMode="decimal" value={toDollars(draft.warranty_cents)} onChange={(e) => setDraft({ ...draft, warranty_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">GAP insurance</Label>
                  <Input inputMode="decimal" value={toDollars(draft.gap_insurance_cents)} onChange={(e) => setDraft({ ...draft, gap_insurance_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sales tax</Label>
                  <Input inputMode="decimal" value={toDollars(draft.taxes_cents)} onChange={(e) => setDraft({ ...draft, taxes_cents: fromDollars(e.target.value) })} />
                </div>
              </div>

              <div className="rounded bg-muted p-2.5 text-sm space-y-0.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(computed.subtotal)}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatPrice(computed.total)}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Deposit</Label>
                  <Input inputMode="decimal" value={toDollars(draft.deposit_cents)} onChange={(e) => setDraft({ ...draft, deposit_cents: fromDollars(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount paid</Label>
                  <Input inputMode="decimal" value={toDollars(draft.amount_paid_cents)} onChange={(e) => setDraft({ ...draft, amount_paid_cents: fromDollars(e.target.value) })} />
                </div>
              </div>
              {computed.balance > 0 && (
                <p className="text-xs text-amber-700 font-medium">
                  Balance due: {formatPrice(computed.balance)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as DealershipSaleStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="deposit_paid">Deposit paid</SelectItem>
                    <SelectItem value="financing">Financing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Payment method</Label>
                <Select
                  value={draft.payment_method ?? "_none"}
                  onValueChange={(v) => setDraft({ ...draft, payment_method: v === "_none" ? null : (v as DealershipSaleDraft["payment_method"]) })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="financing">Financing</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Internal notes</Label>
              <Textarea rows={2} value={draft.internal_notes ?? ""} onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value || null })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.customer_name.trim() || !draft.vehicle_label.trim()}>
              {saving ? "Saving..." : editing ? "Save" : "Create deal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipSalesSection = memo(CarDealershipSalesSectionInner);
export default CarDealershipSalesSection;
