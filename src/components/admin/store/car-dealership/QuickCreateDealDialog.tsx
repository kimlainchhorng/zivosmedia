/**
 * QuickCreateDealDialog — mini-dialog to create a quote-stage deal from a lead
 * or a completed test drive.
 *
 * Captures only the bare minimum (sale price, deposit, status, notes); fees,
 * taxes, trade-in, etc. are added later in the full Sales-section dialog.
 *
 * Used by:
 *  • CarDealershipLeadsSection (per-card ⋯ menu)
 *  • CarDealershipTestDrivesSection (Convert to deal on completed drives)
 */
import { useEffect, useState } from "react";
import { FileSignature, Car, User, Info } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import type {
  DealershipSaleDraft, DealershipSaleStatus,
} from "@/hooks/car-dealership/useDealershipSales";

// ─── seed type ───────────────────────────────────────────────────────────────

export interface QuickDealSeed {
  /** ID of the originating lead (if any). */
  lead_id?: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_id: string | null;
  vehicle_label: string;
  vehicle_vin: string | null;
  /** Default sale price in cents (typically the vehicle's asking_price_cents). */
  sale_price_cents: number;
  /** Optional salesperson seeded from the lead's assigned rep. */
  salesperson_user_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  seed: QuickDealSeed | null;
  saving: boolean;
  onSubmit: (draft: DealershipSaleDraft) => Promise<void> | void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const toDollars = (cents: number) =>
  cents === 0 ? "" : (cents / 100).toFixed(2).replace(/\.00$/, "");

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  return Math.round(parseFloat(cleaned) * 100);
};

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format(cents / 100);

// ─── component ───────────────────────────────────────────────────────────────

export default function QuickCreateDealDialog({
  open, onOpenChange, seed, saving, onSubmit,
}: Props) {
  const [salePrice, setSalePrice] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [status, setStatus] = useState<DealershipSaleStatus>("quote");
  const [notes, setNotes] = useState("");

  // Reseed on (re)open
  useEffect(() => {
    if (open && seed) {
      setSalePrice(seed.sale_price_cents);
      setDeposit(0);
      setStatus("quote");
      setNotes("");
    }
  }, [open, seed]);

  if (!seed) return null;

  const handleSubmit = async () => {
    const draft: DealershipSaleDraft = {
      vehicle_id: seed.vehicle_id,
      customer_id: seed.customer_id,
      lead_id: seed.lead_id ?? null,
      salesperson_user_id: seed.salesperson_user_id ?? null,
      vehicle_label: seed.vehicle_label,
      vehicle_vin: seed.vehicle_vin,
      customer_name: seed.customer_name,
      customer_phone: seed.customer_phone,
      customer_email: seed.customer_email,
      salesperson_name: null,
      sale_price_cents: salePrice,
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
      deposit_cents: deposit,
      amount_paid_cents: deposit,
      status,
      payment_method: null,
      sold_at: null,
      delivered_at: null,
      cancelled_at: null,
      cancellation_reason: null,
      customer_notes: null,
      internal_notes: notes.trim() || null,
    };
    await onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Create deal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Read-only context ── */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-semibold truncate">{seed.customer_name}</span>
              {seed.customer_phone && (
                <span className="text-xs text-muted-foreground truncate">· {seed.customer_phone}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Car className="h-4 w-4 text-muted-foreground shrink-0" />
              {seed.vehicle_label ? (
                <>
                  <span className="truncate">{seed.vehicle_label}</span>
                  {seed.vehicle_vin && (
                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                      · VIN {seed.vehicle_vin}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground italic">No vehicle linked</span>
              )}
            </div>
          </div>

          {/* ── Editable fields ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Sale price ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(salePrice)}
                onChange={(e) => setSalePrice(fromDollars(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deposit ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(deposit)}
                onChange={(e) => setDeposit(fromDollars(e.target.value))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as DealershipSaleStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quote">Quote</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deposit_paid">Deposit paid</SelectItem>
                <SelectItem value="financing">Financing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Internal notes (optional)</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Trade-in details, finance arrangements, contingencies..."
            />
          </div>

          {/* ── Hint ── */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-2.5 text-xs">
            <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-blue-700 dark:text-blue-300">
              This creates a quote-stage deal. Add fees, taxes, trade-in and finalize in the Sales tab.
              {salePrice > 0 && (
                <> Estimated total <strong>{fmtPrice(salePrice)}</strong>; fees/tax apply on top.</>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !seed.customer_name.trim()}>
            {saving ? "Creating..." : "Create deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
