/**
 * Financing applications section — with live payment calculator.
 * Monthly payment is auto-computed using the standard amortisation formula
 * whenever amount, APR, or term changes.
 */
import { memo, useState, useEffect, useMemo } from "react";
import { Plus, Banknote, Pencil, Trash2, Loader2, Calculator } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipFinancing,
  type DealershipFinancing,
  type DealershipFinancingDraft,
  type DealershipFinancingStatus,
} from "@/hooks/car-dealership/useDealershipFinancing";
import CustomerPicker from "./CustomerPicker";
import VehiclePicker from "./VehiclePicker";

// ─── formatting helpers ───────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const fromDollars = (str: string) => {
  const v = parseFloat(str.replace(/[^\d.]/g, ""));
  return isNaN(v) ? 0 : Math.round(v * 100);
};
const toDollars = (cents: number) => (cents / 100).toString();

const fmtApr = (bps: number) => `${(bps / 100).toFixed(2)}%`;

// ─── payment calculator ───────────────────────────────────────────────────────

/**
 * Standard monthly amortisation: M = P·r·(1+r)^n / ((1+r)^n − 1)
 * where r = monthly rate = annualRateBps / 100 / 100 / 12
 * Returns 0 for invalid inputs.
 */
function calcMonthlyPayment(principalCents: number, aprBps: number, termMonths: number): number {
  if (principalCents <= 0 || termMonths <= 0) return 0;
  const annualRate = aprBps / 10000; // bps → decimal
  if (annualRate === 0) {
    // 0% APR — equal principal payments
    return Math.round(principalCents / termMonths);
  }
  const r = annualRate / 12;
  const n = termMonths;
  const factor = Math.pow(1 + r, n);
  const monthly = (principalCents * r * factor) / (factor - 1);
  return Math.round(monthly);
}

// ─── status styles ────────────────────────────────────────────────────────────

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

// ─── component ────────────────────────────────────────────────────────────────

interface Props { storeId: string; }

function CarDealershipFinancingSectionInner({ storeId }: Props) {
  const { financings, loading, saving, create, update, remove } = useDealershipFinancing(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipFinancing | null>(null);
  const [draft, setDraft] = useState<DealershipFinancingDraft>(emptyDraft());
  // Track whether the user manually overrode the calculated payment
  const [paymentOverridden, setPaymentOverridden] = useState(false);
  // vehicle label for display only (from VehiclePicker)
  const [vehicleLabel, setVehicleLabel] = useState("");

  // ── live payment calculation ─────────────────────────────────────────────────
  const calculatedPayment = useMemo(
    () => calcMonthlyPayment(draft.amount_financed_cents - draft.down_payment_cents, draft.apr_bps, draft.term_months),
    [draft.amount_financed_cents, draft.down_payment_cents, draft.apr_bps, draft.term_months],
  );

  // Auto-fill monthly payment whenever the calculator inputs change,
  // unless the user has manually entered their own value.
  useEffect(() => {
    if (!paymentOverridden) {
      setDraft((d) => ({ ...d, monthly_payment_cents: calculatedPayment }));
    }
  }, [calculatedPayment, paymentOverridden]);

  // Summary stats shown in the header
  const summary = useMemo(() => ({
    total: financings.length,
    funded: financings.filter((f) => f.status === "funded").length,
    pending: financings.filter((f) => ["submitted", "approved", "conditionally_approved"].includes(f.status)).length,
    totalFinanced: financings
      .filter((f) => f.status === "funded")
      .reduce((sum, f) => sum + f.amount_financed_cents, 0),
  }), [financings]);

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setPaymentOverridden(false);
    setVehicleLabel("");
    setDialogOpen(true);
  };

  const openEdit = (f: DealershipFinancing) => {
    setEditing(f);
    const { id, store_id, created_at, updated_at, ...rest } = f;
    setDraft(rest);
    setPaymentOverridden(true); // existing record — keep stored value
    setVehicleLabel("");
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
    if (!window.confirm("Delete this financing application?")) return;
    const ok = await remove(f.id);
    if (ok) toast.success("Removed.");
    else toast.error("Couldn't delete.");
  };

  // Derived: net amount actually financed (after down payment)
  const netFinanced = Math.max(0, draft.amount_financed_cents - draft.down_payment_cents);
  const totalCost = calculatedPayment * draft.term_months;
  const totalInterest = Math.max(0, totalCost - netFinanced);

  return (
    <div className="space-y-4">
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Financing</h2>
          <p className="text-sm text-muted-foreground">
            {summary.total} applications · {summary.funded} funded · {summary.pending} pending
            {summary.totalFinanced > 0 && ` · ${fmtPrice(summary.totalFinanced)} funded total`}
          </p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />New application</Button>
      </div>

      {/* ── list ── */}
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
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Banknote className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{f.lender_name || "Unspecified lender"}</p>
                    <Badge className={cn("border-0 text-[10px]", statusStyles[f.status])}>
                      {f.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>{f.term_months} mo</span>
                    <span>{fmtApr(f.apr_bps)} APR</span>
                    {f.application_number && <span>#{f.application_number}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{fmtPrice(f.amount_financed_cents)}</p>
                  <p className="text-xs text-muted-foreground">{fmtPrice(f.monthly_payment_cents)}/mo</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(f)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(f)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit financing application" : "New financing application"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Customer & vehicle links */}
            <CustomerPicker
              storeId={storeId}
              customerId={draft.customer_id}
              customerName=""
              onSelect={(c) => setDraft({ ...draft, customer_id: c?.id ?? null })}
              onNameChange={() => {/* name stored on sale record, not here */}}
            />

            <VehiclePicker
              storeId={storeId}
              vehicleId={null}
              vehicleLabel={vehicleLabel}
              onSelect={(v) => {
                setVehicleLabel(v?.label ?? "");
                // Auto-fill amount from asking price if not yet set
                if (v && draft.amount_financed_cents === 0) {
                  setDraft({
                    ...draft,
                    amount_financed_cents: v.asking_price_cents,
                  });
                  setPaymentOverridden(false);
                }
              }}
              onLabelChange={(label) => setVehicleLabel(label)}
            />

            <Separator />

            {/* Lender info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lender name</Label>
                <Input
                  value={draft.lender_name ?? ""}
                  onChange={(e) => setDraft({ ...draft, lender_name: e.target.value || null })}
                  placeholder="Chase Auto, etc."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Application #</Label>
                <Input
                  value={draft.application_number ?? ""}
                  onChange={(e) => setDraft({ ...draft, application_number: e.target.value || null })}
                />
              </div>
            </div>

            {/* Calculator inputs */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Payment calculator</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Vehicle price ($)</Label>
                  <Input
                    inputMode="decimal"
                    value={toDollars(draft.amount_financed_cents)}
                    onChange={(e) => {
                      setPaymentOverridden(false);
                      setDraft({ ...draft, amount_financed_cents: fromDollars(e.target.value) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Down payment ($)</Label>
                  <Input
                    inputMode="decimal"
                    value={toDollars(draft.down_payment_cents)}
                    onChange={(e) => {
                      setPaymentOverridden(false);
                      setDraft({ ...draft, down_payment_cents: fromDollars(e.target.value) });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">APR (%)</Label>
                  <Input
                    inputMode="decimal"
                    value={(draft.apr_bps / 100).toString()}
                    placeholder="6.99"
                    onChange={(e) => {
                      setPaymentOverridden(false);
                      const v = parseFloat(e.target.value.replace(/[^\d.]/g, ""));
                      setDraft({ ...draft, apr_bps: isNaN(v) ? 0 : Math.round(v * 100) });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Term (months)</Label>
                  <Select
                    value={String(draft.term_months)}
                    onValueChange={(v) => {
                      setPaymentOverridden(false);
                      setDraft({ ...draft, term_months: parseInt(v, 10) });
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[24, 36, 48, 60, 72, 84].map((t) => (
                        <SelectItem key={t} value={String(t)}>{t} months ({t / 12} yr)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Calculated result */}
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Amount financed</span>
                  <span className="text-sm font-medium">{fmtPrice(netFinanced)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Est. monthly payment</span>
                  <span className="text-xl font-bold text-primary">
                    {fmtPrice(calculatedPayment)}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </span>
                </div>
                {totalInterest > 0 && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-primary/10">
                    <span>Total cost ({draft.term_months} payments)</span>
                    <span>{fmtPrice(totalCost)} · {fmtPrice(totalInterest)} interest</span>
                  </div>
                )}
                {paymentOverridden && (
                  <p className="text-[10px] text-amber-600">
                    Stored value differs — calculated: {fmtPrice(calculatedPayment)}/mo
                  </p>
                )}
              </div>

              {/* Manual override for stored payment */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Actual agreed payment ($)
                  <span className="ml-1 text-muted-foreground font-normal">(leave blank to use calculated)</span>
                </Label>
                <Input
                  inputMode="decimal"
                  value={paymentOverridden ? toDollars(draft.monthly_payment_cents) : ""}
                  placeholder={fmtPrice(calculatedPayment).replace("$", "")}
                  onChange={(e) => {
                    setPaymentOverridden(true);
                    setDraft({ ...draft, monthly_payment_cents: fromDollars(e.target.value) });
                  }}
                />
              </div>
            </div>

            {/* Status + dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(v) => setDraft({ ...draft, status: v as DealershipFinancingStatus })}
                >
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
                <Input
                  type="date"
                  value={draft.first_payment_due ?? ""}
                  onChange={(e) => setDraft({ ...draft, first_payment_due: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Decision notes</Label>
              <Textarea
                rows={2}
                value={draft.decision_notes ?? ""}
                onChange={(e) => setDraft({ ...draft, decision_notes: e.target.value || null })}
              />
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
