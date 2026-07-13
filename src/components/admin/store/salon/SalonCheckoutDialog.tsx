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
  Plus, X, Banknote, CreditCard, Gift, Mail,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { useSalonPaymentSettings } from "@/hooks/salon/useSalonPaymentSettings";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

type PaymentMethod = "cash" | "card" | "gift_card" | "check" | "other";

interface PaymentDraft {
  /** Stable React key — payment rows have no DB id until the RPC runs. */
  uid: string;
  method: PaymentMethod;
  /** Free-text dollars (kept as a string so the input doesn't lose
   *  trailing-decimal state mid-typing — e.g. "12." should not reset to
   *  "12" while the user is still typing). Converted to cents on submit. */
  amountDollars: string;
  reference: string;
  /** Resolved gift_card row when method=gift_card and the reference looked
   *  up cleanly. Drives the balance pill + caps the amount. */
  giftCard: { id: string; code: string; balance_cents: number } | null;
  giftCardLookupError: string | null;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  gift_card: "Gift card",
  check: "Check",
  other: "Other",
};

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  card: CreditCard,
  gift_card: Gift,
  check: Receipt,
  other: Mail,
};

const newPaymentUid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  // Membership discount: loaded when the booking has a linked client_id.
  // The owner can untoggle (e.g. gift visit, friend's appointment).
  const [membership, setMembership] = useState<{
    id: string;
    tier_id: string;
    tier_name: string;
    status: string;
    service_discount_percent: number;
  } | null>(null);
  const [applyMemberDiscount, setApplyMemberDiscount] = useState(true);
  // Multi-tender state. Defaults to a single Cash line for the grand total
  // when the dialog opens — single-tap checkout still works one click.
  const [payments, setPayments] = useState<PaymentDraft[]>([]);

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

  // Reset state when booking changes. Clearing retail too prevents the prior
  // booking's items from briefly flashing while the new fetch is in flight.
  useEffect(() => {
    setTipPreset("custom");
    setTipDollars("0.00");
    setError(null);
    setCompletedId(null);
    setRetail([]);
    setPayments([]);
    setMembership(null);
    setApplyMemberDiscount(true);
  }, [booking?.id]);

  // Lazy-load any active membership for the client. Quietly absent for
  // walk-ins (client_id null) or non-members.
  useEffect(() => {
    if (!booking?.client_id) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await (supabase.rpc as any)("salon_get_active_membership_for_client", {
        p_client_id: booking.client_id,
      });
      if (cancelled || err) return;
      const row = (Array.isArray(data) ? data[0] : null) as {
        id: string;
        tier_id: string;
        tier_name: string;
        status: string;
        service_discount_percent: number;
      } | null;
      setMembership(row);
    })();
    return () => { cancelled = true; };
  }, [booking?.client_id]);

  // Service total = base service + add-ons (the trigger maintains the rollup).
  const serviceCents = (booking?.price_cents ?? 0) + (booking?.addons_total_cents ?? 0);
  const retailCents = useMemo(() => retail.reduce((s, r) => s + r.unit_price_cents * r.quantity, 0), [retail]);

  // Membership discount — applies only to service revenue, not retail or
  // tip. Tip base intentionally stays at the pre-discount service amount
  // (US convention: tip on the full service price, not the discounted one).
  const memberDiscountCents = useMemo(() => {
    if (!membership || !applyMemberDiscount) return 0;
    if (membership.service_discount_percent <= 0) return 0;
    return Math.min(serviceCents, Math.round(serviceCents * membership.service_discount_percent / 100));
  }, [membership, applyMemberDiscount, serviceCents]);
  const discountedServiceCents = serviceCents - memberDiscountCents;

  // Tax is charged on goods + services (services + retail). Tip is never
  // included in the tax base — taxing a tip would be wrong everywhere we
  // operate. Compute tax first so the post-tax tip base can use it.
  // Discounted service amount feeds the tax base (a discount lowers the
  // tax owed, same as a coupon).
  const taxBaseCents = discountedServiceCents + retailCents;
  const taxCents = useMemo(() => {
    if (!settings.tax_enabled) return 0;
    return Math.round((taxBaseCents * Number(settings.tax_rate)) / 100);
  }, [settings.tax_enabled, settings.tax_rate, taxBaseCents]);

  // tip_applies_pre_tax:
  //   true  → tip on services only (the typical US convention).
  //   false → tip on services + tax (some salons advertise tip on the post-tax
  //           total). Retail is excluded either way — convention is to tip
  //           the service, not the product.
  // Tip base uses ORIGINAL (pre-member-discount) service cost. The stylist
  // delivered the same service whether the customer is a member or not.
  const tipBaseCents = settings.tip_applies_pre_tax ? serviceCents : serviceCents + taxCents;
  const tipCents = useMemo(() => {
    if (tipPreset === "custom") {
      const c = Math.round(Number(tipDollars) * 100);
      return Number.isFinite(c) && c >= 0 ? c : 0;
    }
    return Math.round((tipBaseCents * tipPreset) / 100);
  }, [tipPreset, tipDollars, tipBaseCents]);

  const grandTotalCents = discountedServiceCents + retailCents + tipCents + taxCents;

  // Seed a default single Cash tender once the grand total is known.
  // Re-runs only when there are NO payment rows yet (the user hasn't started
  // editing). Subsequent total changes don't auto-rewrite the user's input.
  useEffect(() => {
    if (!booking) return;
    setPayments((prev) => {
      if (prev.length > 0) return prev;
      return [{
        uid: newPaymentUid(),
        method: "cash",
        amountDollars: (grandTotalCents / 100).toFixed(2),
        reference: "",
        giftCard: null,
        giftCardLookupError: null,
      }];
    });
  }, [booking, grandTotalCents]);

  // Sum of all tenders (cents). Drives the "Remaining" / "Change due" pill.
  const paidCents = useMemo(() => payments.reduce((s, p) => {
    const v = Math.round(Number(p.amountDollars) * 100);
    return s + (Number.isFinite(v) && v > 0 ? v : 0);
  }, 0), [payments]);

  const remainingCents = grandTotalCents - paidCents;
  const overpaidCents = Math.max(0, -remainingCents);
  // Owners often overpay in cash and hand back change. Any other tender
  // overpaying is a data-entry slip — block it.
  const overpaidByCash = overpaidCents > 0
    && payments.some((p) => p.method === "cash" && Number(p.amountDollars) > 0);
  const isPayable = paidCents >= grandTotalCents
    && (overpaidCents === 0 || overpaidByCash)
    && payments.every((p) => {
      if (Math.round(Number(p.amountDollars) * 100) <= 0) return false;
      if (p.method === "gift_card") {
        // Need a resolved gift card with enough balance.
        return !!p.giftCard
          && Math.round(Number(p.amountDollars) * 100) <= p.giftCard.balance_cents;
      }
      return true;
    });

  const addPayment = () => {
    setPayments((prev) => [...prev, {
      uid: newPaymentUid(),
      method: prev.length === 0 ? "cash" : "card",
      amountDollars: prev.length === 0 ? (grandTotalCents / 100).toFixed(2) : Math.max(0, remainingCents / 100).toFixed(2),
      reference: "",
      giftCard: null,
      giftCardLookupError: null,
    }]);
  };
  const removePayment = (uid: string) => {
    setPayments((prev) => prev.filter((p) => p.uid !== uid));
  };
  const updatePayment = (uid: string, patch: Partial<PaymentDraft>) => {
    setPayments((prev) => prev.map((p) => p.uid === uid ? { ...p, ...patch } : p));
  };

  /** Look a gift card up by code. Called when the owner stops typing in the
   *  reference field for a gift_card tender. Sets the giftCard state on
   *  success, or giftCardLookupError on miss. */
  const lookupGiftCard = async (uid: string, code: string) => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 12) {
      updatePayment(uid, { giftCard: null, giftCardLookupError: null });
      return;
    }
    const { data, error: err } = await supabase
      .from("salon_gift_cards")
      .select("id, code, balance_cents, is_active, expires_at, store_id")
      .eq("code", clean)
      .maybeSingle();
    if (err || !data) {
      updatePayment(uid, { giftCard: null, giftCardLookupError: "Card not found." });
      return;
    }
    const row = data as { id: string; code: string; balance_cents: number; is_active: boolean; expires_at: string | null; store_id: string };
    if (row.store_id !== storeId) {
      updatePayment(uid, { giftCard: null, giftCardLookupError: "This card belongs to a different salon." });
      return;
    }
    if (!row.is_active) {
      updatePayment(uid, { giftCard: null, giftCardLookupError: "This card is inactive." });
      return;
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      updatePayment(uid, { giftCard: null, giftCardLookupError: "This card has expired." });
      return;
    }
    if (row.balance_cents <= 0) {
      updatePayment(uid, { giftCard: null, giftCardLookupError: "This card has no balance." });
      return;
    }
    updatePayment(uid, {
      giftCard: { id: row.id, code: row.code, balance_cents: row.balance_cents },
      giftCardLookupError: null,
    });
  };

  const pickPreset = (n: number) => {
    setTipPreset(n);
    setTipDollars((((tipBaseCents * n) / 100) / 100).toFixed(2));
  };
  const pickCustom = () => {
    setTipPreset("custom");
  };

  const handleConfirm = async () => {
    if (!booking) return;
    if (!isPayable) {
      setError("Payments don't add up to the total yet. Add more or adjust an amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    // Build the RPC's JSONB payload. Cap cash overpayments at the
    // remaining-due so the recorded total matches the grand total —
    // the difference is "change given" and isn't part of the ticket.
    let remaining = grandTotalCents;
    const tenders: Array<{
      method: PaymentMethod;
      amount_cents: number;
      reference?: string;
      gift_card_id?: string;
    }> = [];
    for (const p of payments) {
      const requested = Math.round(Number(p.amountDollars) * 100);
      if (requested <= 0) continue;
      // Cash can overpay — but only record what counts toward the bill;
      // change handed back is operational, not on the ticket.
      const recorded = p.method === "cash"
        ? Math.min(requested, remaining)
        : requested;
      if (recorded <= 0) continue;
      tenders.push({
        method: p.method,
        amount_cents: recorded,
        ...(p.reference.trim() ? { reference: p.reference.trim() } : {}),
        ...(p.method === "gift_card" && p.giftCard ? { gift_card_id: p.giftCard.id } : {}),
      });
      remaining -= recorded;
    }

    const { error: err } = await (supabase.rpc as any)("salon_record_booking_payments", {
      p_booking_id: booking.id,
      p_tip_cents: tipCents,
      p_tax_cents: taxCents,
      p_payments: tenders,
    });
    setSubmitting(false);
    if (err) {
      console.error("[SalonCheckout] complete failed", err);
      const msg = (err as { message?: string }).message || "Couldn't mark the booking complete.";
      setError(msg);
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
                        active ? "border-primary bg-ig-gradient text-white" : "border-border hover:border-primary/40"
                      )}>
                      {p}% <span className="opacity-70">· {formatPrice(ptCents)}</span>
                    </button>
                  );
                })}
                <button type="button" onClick={pickCustom}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    tipPreset === "custom" ? "border-primary bg-ig-gradient text-white" : "border-border hover:border-primary/40"
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

          {/* Membership pill — surfaces the client's active membership +
              lets the owner untoggle the discount per visit. */}
          {membership && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Member</p>
                <p className="text-xs font-semibold text-foreground">
                  {membership.tier_name}
                  {membership.service_discount_percent > 0
                    ? ` · ${membership.service_discount_percent}% off services`
                    : ""}
                </p>
              </div>
              {membership.service_discount_percent > 0 && (
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={applyMemberDiscount}
                    onChange={(e) => setApplyMemberDiscount(e.target.checked)}
                  />
                  Apply discount
                </label>
              )}
            </div>
          )}

          {/* Totals */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <Line label={booking?.service_name || "Service"} value={formatPrice(serviceCents)} />
            {memberDiscountCents > 0 && (
              <Line
                label={`Member discount (${membership?.service_discount_percent}% off)`}
                value={`− ${formatPrice(memberDiscountCents)}`}
              />
            )}
            {retailCents > 0 && <Line label="Retail" value={formatPrice(retailCents)} />}
            {tipCents > 0 && <Line label="Tip" value={formatPrice(tipCents)} />}
            {settings.tax_enabled && (
              <Line label={`${settings.tax_label} (${settings.tax_rate}%)`} value={formatPrice(taxCents)} />
            )}
            <div className="mt-2 border-t border-border pt-2">
              <Line label="Total" value={formatPrice(grandTotalCents)} bold />
            </div>
          </div>

          {/* Payment tenders — supports splits across cash / card / gift card */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Payment</Label>
              <Button
                type="button" variant="ghost" size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={addPayment}
              >
                <Plus className="h-3.5 w-3.5" /> Add payment
              </Button>
            </div>
            <ul className="space-y-2">
              {payments.map((p) => {
                const Icon = METHOD_ICON[p.method];
                return (
                  <li key={p.uid} className="rounded-xl border border-border bg-card p-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <Select
                        value={p.method}
                        onValueChange={(v) => {
                          const nextMethod = v as PaymentMethod;
                          // Switching off gift_card clears the resolved card.
                          updatePayment(p.uid, {
                            method: nextMethod,
                            giftCard: nextMethod === "gift_card" ? p.giftCard : null,
                            giftCardLookupError: null,
                          });
                        }}
                      >
                        <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="gift_card">Gift card</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <Input
                          type="number" min={0} step="0.01"
                          value={p.amountDollars}
                          onChange={(e) => updatePayment(p.uid, { amountDollars: e.target.value })}
                          className="h-9 pl-7"
                        />
                      </div>
                      {payments.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => removePayment(p.uid)}
                          aria-label="Remove payment"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {/* Reference field for non-gift-card tenders; for gift
                        cards it's the code lookup. */}
                    <div className="mt-2">
                      {p.method === "gift_card" ? (
                        <>
                          <Input
                            type="text"
                            value={p.reference}
                            onChange={(e) => updatePayment(p.uid, { reference: e.target.value })}
                            onBlur={() => void lookupGiftCard(p.uid, p.reference)}
                            placeholder="Card code (XXXX-XXXX-XXXX)"
                            className="h-8 text-xs uppercase"
                            maxLength={20}
                          />
                          {p.giftCard && (
                            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                              Balance {formatPrice(p.giftCard.balance_cents)} · code {p.giftCard.code}
                            </p>
                          )}
                          {p.giftCardLookupError && (
                            <p className="mt-1 text-[11px] text-destructive">{p.giftCardLookupError}</p>
                          )}
                          {p.giftCard
                            && Math.round(Number(p.amountDollars) * 100) > p.giftCard.balance_cents && (
                            <p className="mt-1 text-[11px] text-destructive">
                              Amount exceeds card balance.
                            </p>
                          )}
                        </>
                      ) : (
                        <Input
                          type="text"
                          value={p.reference}
                          onChange={(e) => updatePayment(p.uid, { reference: e.target.value })}
                          placeholder={
                            p.method === "card" ? "Last 4 of card (optional)"
                            : p.method === "check" ? "Check # (optional)"
                            : "Reference (optional)"
                          }
                          className="h-8 text-xs"
                          maxLength={200}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Running balance pill — drives the Charge button's enabled state. */}
            <div className={cn(
              "mt-2 rounded-lg border px-3 py-1.5 text-xs font-medium",
              remainingCents > 0
                ? "border-amber-500/40 bg-amber-500/8 text-amber-700 dark:text-amber-300"
                : overpaidCents > 0 && overpaidByCash
                ? "border-sky-500/40 bg-sky-500/8 text-sky-700 dark:text-sky-300"
                : overpaidCents > 0
                ? "border-destructive/40 bg-destructive/8 text-destructive"
                : "border-emerald-500/40 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
            )}>
              {remainingCents > 0
                ? <>Remaining {formatPrice(remainingCents)}</>
                : overpaidCents > 0 && overpaidByCash
                ? <>Change due {formatPrice(overpaidCents)}</>
                : overpaidCents > 0
                ? <>Overpaid by {formatPrice(overpaidCents)} — only cash overpayments allowed.</>
                : <>Paid in full · {formatPrice(paidCents)}</>}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-2 text-xs text-emerald-700 dark:text-emerald-300">
            <Sparkles className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
            {booking?.client_id
              ? <>Completing this will decrement retail stock, update {booking.client_name}'s spend history, and grant loyalty points if your program is on.</>
              : <>Completing this will decrement retail stock. Walk-ins aren't tied to a client record, so no spend history or loyalty points are recorded.</>}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !isPayable}
            className="gap-1.5"
            title={!isPayable ? "Payments must add up to the total" : undefined}
          >
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
