/**
 * SalonCheckoutDialog — replaces a one-click "Complete" with a proper POS
 * flow: service total + retail line items + tip + sales tax → mark complete
 * with the captured tip_cents and tax_cents. The booking-completion trigger
 * handles stock decrement, client aggregates, and loyalty points downstream.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, Loader2, AlertCircle, Sparkles, Receipt, Printer,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSalonPaymentSettings } from "@/hooks/salon/useSalonPaymentSettings";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

interface SalonCheckoutDialogProps {
  storeId: string;
  booking: SalonBooking | null;
  onClose: () => void;
  onCompleted: () => void;
}

interface RetailItem {
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function SalonCheckoutDialog({ storeId, booking, onClose, onCompleted }: SalonCheckoutDialogProps) {
  const { settings } = useSalonPaymentSettings(storeId);
  const [retail, setRetail] = useState<RetailItem[]>([]);
  const [loadingRetail, setLoadingRetail] = useState(false);
  const [tipPreset, setTipPreset] = useState<number | "custom">("custom");
  const [tipDollars, setTipDollars] = useState("0.00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedId, setCompletedId] = useState<string | null>(null);

  useEffect(() => {
    if (!booking) return;
    let cancelled = false;
    (async () => {
      setLoadingRetail(true);
      const { data, error: err } = await supabase
        .from("salon_booking_retail_items")
        .select("product_name, unit_price_cents, quantity")
        .eq("booking_id", booking.id);
      if (cancelled) return;
      if (err) {
        console.error("[SalonCheckout] load retail failed", err);
        setError("Couldn't load retail items.");
        setLoadingRetail(false);
        return;
      }
      setRetail((data ?? []) as unknown as RetailItem[]);
      setLoadingRetail(false);
    })();
    return () => { cancelled = true; };
  }, [booking]);

  // Reset state when booking changes.
  useEffect(() => {
    setTipPreset("custom");
    setTipDollars("0.00");
    setError(null);
    setCompletedId(null);
  }, [booking?.id]);

  const serviceCents = booking?.price_cents ?? 0;
  const retailCents = useMemo(() => retail.reduce((s, r) => s + r.unit_price_cents * r.quantity, 0), [retail]);

  const tipBaseCents = settings.tip_applies_pre_tax ? serviceCents : serviceCents; // tax-exclusive base is service total
  const tipCents = useMemo(() => {
    if (tipPreset === "custom") {
      const c = Math.round(Number(tipDollars) * 100);
      return Number.isFinite(c) && c >= 0 ? c : 0;
    }
    return Math.round((tipBaseCents * tipPreset) / 100);
  }, [tipPreset, tipDollars, tipBaseCents]);

  const taxBaseCents = settings.tax_enabled ? serviceCents + (settings.tip_applies_pre_tax ? 0 : tipCents) : 0;
  const taxCents = useMemo(() => {
    if (!settings.tax_enabled) return 0;
    return Math.round((taxBaseCents * Number(settings.tax_rate)) / 100);
  }, [settings.tax_enabled, settings.tax_rate, taxBaseCents]);

  const grandTotalCents = serviceCents + retailCents + tipCents + taxCents;

  const pickPreset = (n: number) => {
    setTipPreset(n);
    setTipDollars((((tipBaseCents * n) / 100) / 100).toFixed(2));
  };
  const pickCustom = () => {
    setTipPreset("custom");
  };

  const handleConfirm = async () => {
    if (!booking) return;
    setSubmitting(true);
    setError(null);
    // First write tip/tax on the row (UPDATE), then transition to completed
    // so the completion trigger uses the right values when computing spend.
    const { error: writeErr } = await supabase
      .from("salon_bookings")
      .update({ tip_cents: tipCents, tax_cents: taxCents } as never)
      .eq("id", booking.id);
    if (writeErr) {
      console.error("[SalonCheckout] write tip/tax failed", writeErr);
      setError("Couldn't save tip / tax. Try again.");
      setSubmitting(false);
      return;
    }
    const { error: statusErr } = await supabase
      .from("salon_bookings")
      .update({ status: "completed" } as never)
      .eq("id", booking.id);
    setSubmitting(false);
    if (statusErr) {
      console.error("[SalonCheckout] complete failed", statusErr);
      setError("Couldn't mark the booking complete.");
      return;
    }
    toast.success(`Checked out ${booking.client_name} · ${formatPrice(grandTotalCents)}`);
    setCompletedId(booking.id);
    // Don't auto-close — let the owner print the receipt first.
  };

  const handleDone = () => {
    setCompletedId(null);
    onCompleted();
  };

  if (completedId && booking) {
    return (
      <Dialog open={true} onOpenChange={(o) => !o && handleDone()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Charged {formatPrice(grandTotalCents)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm text-foreground">
            <p>
              {booking.client_name}'s visit is closed out. Print a receipt to hand over, or save it as a PDF to email.
            </p>
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              Reference <span className="font-mono text-foreground">#{booking.id.slice(0, 8).toUpperCase()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleDone}>Done</Button>
            <Button type="button" asChild className="gap-1.5">
              <Link to={`/admin/salon-receipt/${booking.id}`} target="_blank" rel="noopener">
                <Printer className="h-4 w-4" /> Print receipt
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={booking !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Checkout · {booking?.client_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Service line */}
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">{booking?.service_name}</span>
              <span className="font-semibold text-foreground">{formatPrice(serviceCents)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{booking?.duration_minutes} min{booking?.stylist_name ? ` · ${booking.stylist_name}` : ""}</p>
          </div>

          {/* Retail line items */}
          {loadingRetail ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading retail…</div>
          ) : retail.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-3 text-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retail</p>
              <ul className="divide-y divide-border">
                {retail.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-1">
                    <span className="truncate text-foreground/90">{r.quantity}× {r.product_name}</span>
                    <span className="font-medium text-foreground">{formatPrice(r.unit_price_cents * r.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Tip presets */}
          {settings.tips_enabled && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tip</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {settings.tip_presets.map((p) => {
                  const active = tipPreset === p;
                  const ptCents = Math.round((tipBaseCents * p) / 100);
                  return (
                    <button type="button" key={p} onClick={() => pickPreset(p)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                      )}>
                      {p}% <span className="opacity-70">· {formatPrice(ptCents)}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={pickCustom}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    tipPreset === "custom" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                  )}>Custom</button>
              </div>
              {tipPreset === "custom" && (
                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input type="number" min={0} step="0.01" value={tipDollars} onChange={(e) => setTipDollars(e.target.value)} className="pl-7" />
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tip is {settings.tip_applies_pre_tax ? "pre-tax" : "post-tax"}. Service base: {formatPrice(tipBaseCents)}.
              </p>
            </div>
          )}

          {/* Totals */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <Line label={booking?.service_name || "Service"} value={formatPrice(serviceCents)} />
            {retailCents > 0 && <Line label="Retail" value={formatPrice(retailCents)} />}
            {tipCents > 0 && <Line label="Tip" value={formatPrice(tipCents)} />}
            {settings.tax_enabled && (
              <Line label={`${settings.tax_label} (${settings.tax_rate}%)`} value={formatPrice(taxCents)} />
            )}
            <div className="mt-2 border-t border-border pt-2">
              <Line label="Total" value={formatPrice(grandTotalCents)} bold />
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-2 text-xs text-emerald-700 dark:text-emerald-300">
            <Sparkles className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
            Completing this will decrement retail stock, update {booking?.client_name}'s spend history{settings.tax_enabled ? "" : ""}, and grant loyalty points if your program is on.
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting} className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Charge {formatPrice(grandTotalCents)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-foreground/85", bold && "font-bold text-foreground")}>{label}</span>
      <span className={cn(bold && "text-base font-bold text-foreground")}>{value}</span>
    </div>
  );
}
