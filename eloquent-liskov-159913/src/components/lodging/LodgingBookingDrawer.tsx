/**
 * LodgingBookingDrawer - Multi-step booking sheet (stay → add-ons → guest → review → success).
 * Writes a 'hold' lodge_reservations row with addons + fee breakdown + payment method.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle2, Minus, Plus, AlertTriangle,
  Wallet, CreditCard, Building2, Copy, CalendarPlus, MessageCircle, ShieldCheck,
  ArrowDown, Share2, BookOpen, FileText,
  BedDouble, Sun, BadgePercent, UserPlus, Baby, Sparkles, Building,
  Receipt, ConciergeBell, Landmark, Coins, QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ResponsiveModal, ResponsiveModalFooter } from "@/components/ui/responsive-modal";
import { CountryPhoneInput } from "@/components/auth/CountryPhoneInput";
import { LodgingStaySelector } from "@/components/lodging/LodgingStaySelector";
import { ReservationStatusTimeline } from "@/components/lodging/ReservationStatusTimeline";
import { LodgingPaymentBadge } from "@/components/lodging/LodgingPaymentBadge";
import { LodgingEmbeddedCheckout } from "@/components/lodging/LodgingEmbeddedCheckout";
import KHQRPaymentModal from "@/components/shop/KHQRPaymentModal";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AddonIcon } from "@/components/lodging/addonIcons";
import { IcsPreviewPanel } from "@/components/lodging/IcsPreviewPanel";
import { PolicySourceSheet } from "@/components/lodging/PolicySourceSheet";
import { ConflictReasonPanel } from "@/components/lodging/ConflictReasonPanel";
import { useRoomAvailability, hasUnavailableNight } from "@/hooks/lodging/useRoomAvailability";
import { useLodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { useRoomConflictCheck, checkRoomConflictNow } from "@/hooks/lodging/useRoomConflictCheck";
import { useReservationLive } from "@/hooks/lodging/useReservationLive";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { cancellationLabel, cancellationDescription } from "@/lib/lodging/cancellationCopy";
import { validateGuest } from "@/lib/lodging/guestSchema";
import type { LodgeAddon, RoomFees, ChildPolicy } from "@/hooks/lodging/useLodgeRooms";

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  storePhone?: string | null;
  roomId: string;
  roomName: string;
  ratePlanLabel?: string;
  baseRateCents: number;
  weekendRateCents?: number;
  weeklyDiscountPct?: number;
  monthlyDiscountPct?: number;
  cancellationPolicy?: string | null;
  addons?: LodgeAddon[];
  fees?: RoomFees;
  childPolicy?: ChildPolicy;
  minStay?: number;
  maxStay?: number | null;
  noArrivalWeekdays?: number[];
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  onBooked?: () => void;
}

type Step = "stay" | "addons" | "guest" | "review" | "success";
type PayMethod = "pay_at_property" | "card_on_arrival" | "bank_transfer" | "khqr";

interface SelectedAddon extends LodgeAddon {
  qty: number;
}

const ETA_OPTIONS = [
  "Before 3 PM", "3 – 6 PM", "6 – 9 PM", "After 9 PM", "Next day", "Not sure yet",
];

const PAY_METHODS: { id: PayMethod; label: string; sub: string; icon: typeof Wallet }[] = [
  { id: "pay_at_property", label: "Pay at the property", sub: "Cash or card on arrival — no charge now", icon: Wallet },
  { id: "card_on_arrival", label: "Card on file (charged on arrival)", sub: "We'll collect card details at check-in", icon: CreditCard },
  { id: "bank_transfer",  label: "Bank transfer / deposit", sub: "Host will share details by message", icon: Building2 },
  { id: "khqr", label: "KHQR / ABA Pay", sub: "Scan with ABA Mobile or any KHQR app", icon: QrCode },
];

export function LodgingBookingDrawer({
  open, onClose, storeId, storeName, storePhone, roomId, roomName, ratePlanLabel,
  baseRateCents, weekendRateCents, weeklyDiscountPct = 0, monthlyDiscountPct = 0,
  cancellationPolicy, addons = [], fees, childPolicy,
  minStay = 1, maxStay, noArrivalWeekdays = [],
  checkIn: initialCi, checkOut: initialCo, adults: initialAdults, children: initialChildren,
  onBooked,
}: Props) {
  const { format: fmtCurrency } = useCurrency();
  const [step, setStep] = useState<Step>("stay");
  const [checkIn, setCheckIn] = useState(initialCi);
  const [checkOut, setCheckOut] = useState(initialCo);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [selected, setSelected] = useState<Record<number, SelectedAddon>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [eta, setEta] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("pay_at_property");
  // Inline payment-card method toggle (Card | Apple/Google Pay | Cash). Only used in success step.
  const [inlineMethod, setInlineMethod] = useState<"card" | "wallet" | "cash" | "paypal" | "square">("card");
  const [agreeRules, setAgreeRules] = useState(false);
  const [agreeCancel, setAgreeCancel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [khqrOpen, setKhqrOpen] = useState(false);
  const [reservationStatus] = useState<"hold" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show">("hold");
  const [guestTouched, setGuestTouched] = useState<Record<string, boolean>>({});
  const [policyScrolled, setPolicyScrolled] = useState(false);
  const [policyOverflows, setPolicyOverflows] = useState(false);
  const [viewedRulesSource, setViewedRulesSource] = useState(false);
  const [viewedCancelSource, setViewedCancelSource] = useState(false);
  const [rulesViewedAt, setRulesViewedAt] = useState<string | null>(null);
  const [cancelViewedAt, setCancelViewedAt] = useState<string | null>(null);
  const policyRef = useRef<HTMLDivElement | null>(null);

  const { data: propertyProfile } = useLodgePropertyProfile(storeId);
  const houseRules = (propertyProfile?.house_rules || {}) as Record<string, any>;

  const { availabilityMap, disabledDates } = useRoomAvailability(open ? roomId : undefined);
  const rangeIssue = useMemo(
    () => hasUnavailableNight(availabilityMap, checkIn, checkOut),
    [availabilityMap, checkIn, checkOut]
  );
  const { data: conflictData, refetch: refetchConflict } = useRoomConflictCheck(
    open ? roomId : undefined, checkIn, checkOut, step === "review"
  );
  const conflictDetected = !!conflictData?.conflict;
  const conflictRows = conflictData?.rows || [];

  const { data: liveReservation } = useReservationLive(reservationId || undefined);

  // Stay-rules validation
  const stayIssue = useMemo(() => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
    if (nights < (minStay || 1)) return { invalid: true, msg: `Minimum stay is ${minStay} night${minStay! > 1 ? "s" : ""}` };
    if (maxStay && nights > maxStay) return { invalid: true, msg: `Maximum stay is ${maxStay} nights` };
    if (noArrivalWeekdays?.includes(ci.getDay())) {
      return { invalid: true, msg: "This room can't be booked to start on this weekday" };
    }
    return { invalid: false, msg: "" };
  }, [checkIn, checkOut, minStay, maxStay, noArrivalWeekdays]);

  const breakdown = useMemo(() => {
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    const nights = Math.max(1, Math.round((co.getTime() - ci.getTime()) / 86400000));
    const totalGuests = adults + children;
    let roomTotal = 0;
    let weekendNights = 0;
    for (let i = 0; i < nights; i++) {
      const d = new Date(ci.getTime() + i * 86400000);
      const dow = d.getDay();
      const isWeekend = dow === 5 || dow === 6;
      if (isWeekend && weekendRateCents) weekendNights++;
      roomTotal += isWeekend && weekendRateCents ? weekendRateCents : baseRateCents;
    }
    const weekendUplift = weekendNights * Math.max(0, (weekendRateCents || baseRateCents) - baseRateCents);
    let discountPct = 0;
    if (nights >= 28 && monthlyDiscountPct) discountPct = monthlyDiscountPct;
    else if (nights >= 7 && weeklyDiscountPct) discountPct = weeklyDiscountPct;
    const discountCents = Math.round(roomTotal * (discountPct / 100));
    const roomAfter = roomTotal - discountCents;

    const addonsSnapshot: (LodgeAddon & { qty: number; subtotal_cents: number })[] = [];
    let addonsTotal = 0;
    Object.values(selected).forEach((a) => {
      if (!a.qty) return;
      let units = a.qty;
      if (a.per === "night") units *= nights;
      else if (a.per === "guest") units *= totalGuests;
      else if (a.per === "person_night") units *= nights * totalGuests;
      const subtotal = a.price_cents * units;
      addonsTotal += subtotal;
      addonsSnapshot.push({
        name: a.name, price_cents: a.price_cents, per: a.per, qty: a.qty,
        subtotal_cents: subtotal, category: a.category, icon: a.icon,
      });
    });

    const baseOccupancy = 2;
    const extraAdults = Math.max(0, adults - baseOccupancy);
    const extraChildren = children;
    const extraAdultFee = (childPolicy?.extra_adult_fee_cents || 0) * extraAdults * nights;
    const extraChildFee = (childPolicy?.extra_child_fee_cents || 0) * extraChildren * nights;
    const extraGuestTotal = extraAdultFee + extraChildFee;

    const cityTax = (fees?.city_tax_cents || 0) * totalGuests * nights;
    const resortFee = (fees?.resort_fee_cents || 0) * nights;
    const cleaningFee = fees?.cleaning_fee_cents || 0;
    const taxableSubtotal = roomAfter + addonsTotal + extraGuestTotal + resortFee + cleaningFee;
    const serviceCharge = Math.round(taxableSubtotal * ((fees?.service_charge_pct || 0) / 100));
    const vat = Math.round((taxableSubtotal + serviceCharge) * ((fees?.vat_pct || 0) / 100));

    const feesTotal = cityTax + resortFee + cleaningFee + serviceCharge + vat;
    const total = roomAfter + addonsTotal + extraGuestTotal + feesTotal;

    const feeBreakdown = {
      city_tax_cents: cityTax,
      resort_fee_cents: resortFee,
      cleaning_fee_cents: cleaningFee,
      service_charge_cents: serviceCharge,
      vat_cents: vat,
      extra_adult_fee_cents: extraAdultFee,
      extra_child_fee_cents: extraChildFee,
      weekend_uplift_cents: weekendUplift,
      discount_cents: discountCents,
    };

    return {
      nights, totalGuests, roomTotal, weekendUplift, discountPct, discountCents, roomAfter,
      addonsTotal, addonsSnapshot, extraGuestTotal, extraAdultFee, extraChildFee,
      cityTax, resortFee, cleaningFee, serviceCharge, vat, feesTotal, total, feeBreakdown,
    };
  }, [checkIn, checkOut, baseRateCents, weekendRateCents, weeklyDiscountPct, monthlyDiscountPct, selected, adults, children, fees, childPolicy]);

  const hasAddons = (addons || []).length > 0;
  const securityDeposit = (childPolicy as any)?.security_deposit_cents || 0;

  const goNext = () => {
    if (step === "stay") setStep(hasAddons ? "addons" : "guest");
    else if (step === "addons") setStep("guest");
    else if (step === "guest") setStep("review");
  };
  const goBack = () => {
    if (step === "review") setStep("guest");
    else if (step === "guest") setStep(hasAddons ? "addons" : "stay");
    else if (step === "addons") setStep("stay");
  };

  const guestCheck = useMemo(() => validateGuest({ name, phone, email }), [name, phone, email]);
  const guestValid = guestCheck.valid;
  const reviewValid = agreeRules && agreeCancel && !!payMethod && (policyScrolled || !policyOverflows) && viewedRulesSource && viewedCancelSource && !conflictDetected;

  // Detect if policy panel overflows once rendered
  useEffect(() => {
    if (step !== "review") return;
    const el = policyRef.current;
    if (!el) return;
    const overflows = el.scrollHeight > el.clientHeight + 2;
    setPolicyOverflows(overflows);
    if (!overflows) setPolicyScrolled(true);
  }, [step, propertyProfile, cancellationPolicy]);

  const onPolicyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 6) setPolicyScrolled(true);
  };

  const triggerStripeDeposit = async (resId: string) => {
    // Hosted Stripe Checkout (new tab) — used as a fallback for the "Retry" button on the
    // payment badge. The primary card-on-arrival flow uses the inline Embedded Checkout
    // rendered in the success step (LodgingEmbeddedCheckout) so the user stays in the booking sheet.
    try {
      const depositCents = securityDeposit > 0 ? securityDeposit : breakdown.total;
      const { data: sessionData, error: fnErr } = await supabase.functions.invoke("create-lodging-deposit", {
        body: {
          reservation_id: resId,
          store_id: storeId,
          deposit_cents: depositCents,
          mode: securityDeposit > 0 ? "deposit" : "full",
          ui_mode: "hosted",
        },
      });
      if (fnErr) throw fnErr;
      if (sessionData?.url) {
        window.open(sessionData.url, "_blank");
        toast.success("Opening secure Stripe checkout…");
      }
    } catch (payErr: any) {
      toast.error(payErr?.message || "Could not open Stripe checkout");
    }
  };

  const handleRetryPayment = async () => {
    if (!reservationId) return;
    await triggerStripeDeposit(reservationId);
  };

  const submit = async () => {
    if (!guestValid) { toast.error("Please complete your guest details"); setStep("guest"); return; }
    if (!reviewValid) { toast.error("Please read & accept the policies"); return; }
    setSubmitting(true);
    try {
      // Race-condition guard: re-check availability immediately before insert
      try {
        const fresh = await checkRoomConflictNow(roomId, checkIn, checkOut);
        if (fresh.conflict) {
          const refs = fresh.rows.map(r => `#${r.reference || r.id.slice(0, 6)}`).join(", ");
          toast.error("These dates were just booked", {
            description: `Conflicts with ${refs}. Please pick new dates.`,
          });
          setSubmitting(false);
          await refetchConflict();
          return;
        }
      } catch (_) { /* non-fatal */ }
      const ref = `RES-${Date.now().toString().slice(-6)}`;
      const policyConsent = {
        rules: {
          viewed_at: rulesViewedAt,
          viewed_section: "house_rules",
        },
        cancellation: {
          viewed_at: cancelViewedAt,
          viewed_section: "cancellation_policy",
          policy_key: cancellationPolicy || null,
        },
        agreed_at: new Date().toISOString(),
      };
      const policyConsentVersion =
        (propertyProfile as any)?.updated_at || new Date().toISOString();
      const { data: inserted, error } = await supabase.from("lodge_reservations" as any).insert({
        store_id: storeId,
        room_id: roomId,
        number: ref,
        guest_name: name, guest_phone: phone, guest_email: email || null, guest_country: country || null,
        adults, children, check_in: checkIn, check_out: checkOut,
        status: "hold", source: "direct",
        rate_cents: baseRateCents, total_cents: breakdown.total, payment_status: "unpaid",
        addons: breakdown.addonsSnapshot,
        addon_selections: breakdown.addonsSnapshot,
        fee_breakdown: breakdown.feeBreakdown,
        guest_details: { name, phone, email, country, eta, notes, pay_method: payMethod },
        notes: notes || null,
        policy_consent: policyConsent,
        policy_consent_version: policyConsentVersion,
      }).select("id").maybeSingle();
      if (error) throw error;
      setReference(ref);
      const newId = (inserted as any)?.id || null;
      setReservationId(newId);
      setStep("success");
      onBooked?.();
      if (payMethod === "khqr" && newId) setKhqrOpen(true);
      if (payMethod !== "card_on_arrival" && newId) {
        supabase.functions.invoke("notify-lodging-booking-confirmed", {
          body: { reservationId: newId, paymentMethod: payMethod },
        }).catch(() => {});
      }

      // For "card_on_arrival" we no longer auto-open Stripe in a new tab —
      // the inline LodgingEmbeddedCheckout shown on the success step now
      // handles authorising the card without leaving the booking sheet.
      // (Use the "Retry" button on the payment badge to fall back to hosted Stripe.)
    } catch (e: any) {
      toast.error(e.message || "Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtMoney = (c: number) => fmtCurrency(c / 100, "USD");
  const blocked = rangeIssue.invalid || stayIssue.invalid;

  const stepLabel =
    step === "stay" ? "Step 1 · Your stay" :
    step === "addons" ? "Step 2 · Add-ons" :
    step === "guest" ? "Step 3 · Guest info" :
    step === "review" ? "Step 4 · Review & confirm" :
    "Booking submitted";

  const setAddonQty = (idx: number, qty: number, addon?: LodgeAddon) => {
    setSelected(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[idx];
      else next[idx] = { ...(addon || prev[idx]), qty };
      return next;
    });
  };

  const handleClose = () => {
    // Reset for next open
    if (step === "success") {
      setStep("stay"); setSelected({}); setReference(null); setReservationId(null);
      setName(""); setPhone(""); setEmail(""); setCountry(""); setEta(""); setNotes("");
      setAgreeRules(false); setAgreeCancel(false); setPayMethod("pay_at_property");
      setGuestTouched({}); setPolicyScrolled(false); setPolicyOverflows(false);
      setViewedRulesSource(false); setViewedCancelSource(false);
      setRulesViewedAt(null); setCancelViewedAt(null); setKhqrOpen(false);
    }
    onClose();
  };

  // .ics generation now lives inside IcsPreviewPanel — see success step below.

  const copyRef = () => {
    if (!reference) return;
    navigator.clipboard.writeText(reference);
    toast.success("Reference copied");
  };

  const shareBooking = async () => {
    if (!reservationId) return;
    const url = `${window.location.origin}/trip/${reservationId}`;
    const title = `Booking ${reference} · ${storeName}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text: title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Booking link copied");
      }
    } catch (_) { /* user cancelled */ }
  };

  const openChatWithHost = async () => {
    try {
      const { data: store } = await supabase
        .from("store_profiles" as any)
        .select("owner_id")
        .eq("id", storeId)
        .maybeSingle();
      const ownerId = (store as any)?.owner_id;
      if (!ownerId) { toast.error("Host chat unavailable"); return; }
      window.location.href = `/chat?with=${ownerId}`;
    } catch {
      toast.error("Could not open chat");
    }
  };

  const stepIndex = step === "stay" ? 0 : step === "addons" ? 1 : step === "guest" ? 2 : step === "review" ? 3 : 4;
  const totalSteps = hasAddons ? 4 : 3;
  const visibleStepIndex = hasAddons ? stepIndex : (stepIndex === 0 ? 0 : stepIndex - 1);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(v) => !v && handleClose()}
      title={step === "success" ? "🎉 Booking submitted" : `Reserve · ${roomName}`}
      description={step !== "success" ? (ratePlanLabel ? `${ratePlanLabel} · ${stepLabel}` : stepLabel) : undefined}
      footer={
        step === "success" ? (
          <ResponsiveModalFooter>
            <Button onClick={handleClose} className="font-bold w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/25" size="lg">Done</Button>
          </ResponsiveModalFooter>
        ) : (
          <ResponsiveModalFooter>
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 text-[11px] font-bold text-emerald-700 dark:from-emerald-950/40 dark:to-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-300 tabular-nums">
                {breakdown.nights} {breakdown.nights === 1 ? "night" : "nights"} · {adults + children} {adults + children === 1 ? "guest" : "guests"} · {fmtMoney(breakdown.total)}
              </span>
              <div className="flex items-center gap-2">
                {step !== "stay" && (
                  <Button variant="outline" onClick={goBack} className="gap-1 rounded-full" size="sm">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {step !== "review" ? (
                  <Button
                    onClick={goNext}
                    className="gap-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25"
                    size="sm"
                    disabled={blocked || (step === "guest" && !guestValid)}
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={submit} disabled={submitting || blocked || !reviewValid} className="gap-1 font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/25" size="sm">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm · {fmtMoney(breakdown.total)}
                  </Button>
                )}
              </div>
            </div>
          </ResponsiveModalFooter>
        )
      }
    >
      <div className="space-y-4 pt-2">
        {/* Step progress dots */}
        {step !== "success" && (
          <div className="flex items-center gap-1.5 px-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full flex-1 transition-all duration-300",
                  i < visibleStepIndex ? "bg-emerald-500" : i === visibleStepIndex ? "bg-emerald-600" : "bg-muted"
                )}
              />
            ))}
          </div>
        )}

        {step !== "success" && (rangeIssue.invalid || stayIssue.invalid) && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="text-xs font-medium space-y-0.5">
              {rangeIssue.invalid && (
                <p>One or more nights are no longer available ({rangeIssue.firstReason === "sold_out" ? "sold out" : "restricted"}).</p>
              )}
              {stayIssue.invalid && <p>{stayIssue.msg}</p>}
              {step !== "stay" && <p className="font-semibold">Tap Back to pick new dates.</p>}
            </div>
          </div>
        )}

        {step === "stay" && (
          <>
            <LodgingStaySelector
              checkIn={checkIn} checkOut={checkOut} adults={adults} children={children}
              onChange={(v) => { setCheckIn(v.checkIn); setCheckOut(v.checkOut); setAdults(v.adults); setChildren(v.children); }}
              disabledDates={disabledDates}
              availabilityMap={availabilityMap}
              showReasonLegend
            />
            <PriceSummary breakdown={breakdown} fmt={fmtMoney} />
          </>
        )}

        {(step === "addons" || step === "guest" || step === "review") && (
          <LodgingStaySelector
            checkIn={checkIn} checkOut={checkOut} adults={adults} children={children}
            onChange={() => {}}
            availabilityMap={availabilityMap}
            disabledDates={disabledDates}
            locked
          />
        )}

        {step === "addons" && (
          <>
            {!hasAddons ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No extras for this room.</p>
            ) : (
              <div className="space-y-2">
                {addons.map((a, i) => {
                  const sel = selected[i];
                  const checked = !!sel?.qty;
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => setAddonQty(i, v ? 1 : 0, a)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold flex items-center gap-1.5">
                          {a.icon && <AddonIcon slug={a.icon} className="h-3.5 w-3.5 text-primary" />}
                          {a.name || "Untitled add-on"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtMoney(a.price_cents)} per {a.per === "person_night" ? "guest / night" : a.per}
                        </p>
                      </div>
                      {checked && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                            onClick={() => setAddonQty(i, Math.max(0, (sel.qty || 1) - 1), a)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number" inputMode="numeric" min={1}
                            className="w-12 h-7 text-xs text-center"
                            value={sel.qty}
                            onChange={(e) => {
                              const n = Math.max(1, parseInt(e.target.value) || 1);
                              setAddonQty(i, n, a);
                            }}
                          />
                          <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                            onClick={() => setAddonQty(i, (sel.qty || 1) + 1, a)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <PriceSummary breakdown={breakdown} fmt={fmtMoney} />
          </>
        )}

        {step === "guest" && (
          <>
            <div>
              <Label>Full name *</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => setGuestTouched(t => ({ ...t, name: true }))}
                placeholder="Your full name"
                aria-invalid={!!(guestTouched.name && guestCheck.errors.name)}
              />
              {guestTouched.name && guestCheck.errors.name && (
                <p className="text-[11px] text-destructive mt-1">{guestCheck.errors.name}</p>
              )}
            </div>
            <div onBlur={() => setGuestTouched(t => ({ ...t, phone: true }))}>
              <Label>Phone *</Label>
              <CountryPhoneInput value={phone} onChange={setPhone} />
              {guestTouched.phone && guestCheck.errors.phone && (
                <p className="text-[11px] text-destructive mt-1">{guestCheck.errors.phone}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={() => setGuestTouched(t => ({ ...t, email: true }))}
                  placeholder="you@example.com"
                  aria-invalid={!!(guestTouched.email && guestCheck.errors.email)}
                />
                {guestTouched.email && guestCheck.errors.email && (
                  <p className="text-[11px] text-destructive mt-1">{guestCheck.errors.email}</p>
                )}
              </div>
              <div><Label>Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. United States" /></div>
            </div>
            <div>
              <Label>Estimated arrival time</Label>
              <select value={eta} onChange={e => setEta(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Choose ETA…</option>
                {ETA_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div><Label>Notes / special requests</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Late check-in, extra pillows, dietary needs…" /></div>
            <PriceSummary breakdown={breakdown} fmt={fmtMoney} />
          </>
        )}

        {step === "review" && (
          <>
            {/* Booking summary */}
            <div className="p-4 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 space-y-2 text-xs shadow-sm">
              <div className="flex items-start justify-between gap-3 pb-2 border-b border-border/50">
                <div className="min-w-0">
                  <p className="font-bold text-base text-foreground">{roomName}</p>
                  <p className="text-muted-foreground truncate">{storeName}</p>
                  {ratePlanLabel && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                      <span className="h-2.5 w-2.5 inline-block rounded-full bg-amber-500/60" /> {ratePlanLabel}
                    </span>
                  )}
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Hold</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dates</span><span className="font-medium">{checkIn} → {checkOut} · {breakdown.nights}n</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Guests</span><span className="font-medium">{adults} adult{adults > 1 ? "s" : ""}{children > 0 ? `, ${children} child${children > 1 ? "ren" : ""}` : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Guest</span><span className="font-medium truncate ml-2">{name}</span></div>
              {eta && <div className="flex justify-between"><span className="text-muted-foreground">Arrival ETA</span><span className="font-medium">{eta}</span></div>}
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Payment method</Label>
              {PAY_METHODS.map(m => {
                const Icon = m.icon;
                const active = payMethod === m.id;
                return (
                  <button type="button"
                    key={m.id} onClick={() => setPayMethod(m.id)}
                    className={cn(
                      "w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all",
                      active
                        ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/40 shadow-md shadow-emerald-500/10 dark:from-emerald-950/40 dark:to-emerald-900/20"
                        : "border-border bg-card hover:bg-muted/40 hover:border-border/80"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-bold", active && "text-emerald-700 dark:text-emerald-300")}>{m.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.sub}</p>
                    </div>
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 mt-1 shrink-0 flex items-center justify-center transition-all",
                      active ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30"
                    )}>
                      {active && <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Deposit notice */}
            {securityDeposit > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>A refundable security deposit of <strong>{fmtMoney(securityDeposit)}</strong> may be collected at check-in.</p>
              </div>
            )}

            <PriceSummary breakdown={breakdown} fmt={fmtMoney} />

            {/* House rules + cancellation policy (scroll-to-confirm) */}
            <div className="space-y-2">
              <Label className="flex items-center justify-between">
                <span>House rules &amp; cancellation policy</span>
                {policyOverflows && !policyScrolled && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                    <ArrowDown className="h-3 w-3" /> Scroll to read all
                  </span>
                )}
              </Label>
              <div
                ref={policyRef}
                onScroll={onPolicyScroll}
                className="max-h-44 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3 text-[11px] leading-relaxed space-y-2"
              >
                <div>
                  <p className="font-bold text-xs mb-1">House rules</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {houseRules.quiet_hours && <li>Quiet hours: {houseRules.quiet_hours}</li>}
                    <li>Parties / events: {houseRules.parties_allowed ? "allowed (please notify host)" : "not allowed"}</li>
                    {houseRules.smoking_zones && <li>Smoking: {houseRules.smoking_zones}</li>}
                    {houseRules.min_age != null && <li>Minimum guest age: {houseRules.min_age}+</li>}
                    {houseRules.id_at_checkin && <li>Government-issued ID required at check-in</li>}
                    {securityDeposit > 0 && <li>Refundable security deposit: <strong>{fmtMoney(securityDeposit)}</strong> (collected at check-in)</li>}
                    {!Object.keys(houseRules).length && (
                      <li className="text-muted-foreground">Standard house rules apply. Please respect the property and other guests.</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-xs mb-1">
                    Cancellation policy · {cancellationLabel(cancellationPolicy)}
                  </p>
                  <p>{cancellationDescription(cancellationPolicy)}</p>
                </div>
                <p className="text-muted-foreground pt-1">
                  ZIVO is a marketplace; {storeName} is the merchant of record for your stay and handles refunds, modifications, and on-site issues.
                </p>
              </div>
            </div>

            {/* Conflict reason panel (live re-check) */}
            {conflictDetected && (
              <ConflictReasonPanel
                conflicts={conflictRows}
                onPickNewDates={() => setStep("stay")}
              />
            )}

            {/* Consent — compact verified chips */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold text-muted-foreground mr-1">Verify before agreeing:</p>
                <div className="inline-flex items-center gap-1.5">
                  <PolicySourceSheet
                    type="house_rules"
                    houseRules={houseRules as any}
                    onOpened={() => {
                      if (!viewedRulesSource) {
                        setViewedRulesSource(true);
                        setRulesViewedAt(new Date().toISOString());
                      }
                    }}
                  />
                  {viewedRulesSource && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <PolicySourceSheet
                    type="cancellation"
                    cancellationKey={cancellationPolicy}
                    onOpened={() => {
                      if (!viewedCancelSource) {
                        setViewedCancelSource(true);
                        setCancelViewedAt(new Date().toISOString());
                      }
                    }}
                  />
                  {viewedCancelSource && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className={cn("flex items-start gap-2 text-xs cursor-pointer", ((policyOverflows && !policyScrolled) || !viewedRulesSource) && "opacity-50 pointer-events-none")}>
                  <Checkbox
                    checked={agreeRules}
                    onCheckedChange={(v) => setAgreeRules(!!v)}
                    className="mt-0.5"
                    disabled={(policyOverflows && !policyScrolled) || !viewedRulesSource}
                  />
                  <span>I have read and agree to the <strong>house rules</strong> and check-in policy.</span>
                </label>
              </div>

              <div>
                <label className={cn("flex items-start gap-2 text-xs cursor-pointer", ((policyOverflows && !policyScrolled) || !viewedCancelSource) && "opacity-50 pointer-events-none")}>
                  <Checkbox
                    checked={agreeCancel}
                    onCheckedChange={(v) => setAgreeCancel(!!v)}
                    className="mt-0.5"
                    disabled={(policyOverflows && !policyScrolled) || !viewedCancelSource}
                  />
                  <span>
                    I accept the <strong>{cancellationLabel(cancellationPolicy)}</strong> cancellation policy and authorise {storeName} to contact me about this reservation.
                  </span>
                </label>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              By tapping <strong>Confirm</strong>, your request is sent to {storeName} for confirmation. ZIVO is a marketplace; the property is the merchant of record for your stay.
            </p>
          </>
        )}

        {step === "success" && reference && (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-ig-gradient opacity-30 blur-xl" />
                <div className="relative h-20 w-20 rounded-full bg-ig-gradient flex items-center justify-center shadow-lg shadow-black/10 ring-2 ring-background">
                  <CheckCircle2 className="h-11 w-11 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Your booking request was sent to</p>
              <p className="font-bold text-lg">{storeName}</p>
            </div>

            <div className="p-4 rounded-2xl border-2 border-dashed border-foreground/15 bg-gradient-to-br from-muted/40 to-card text-center">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">Reference</p>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <p className="font-extrabold text-2xl tracking-wider text-ig-gradient">{reference}</p>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={copyRef}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status timeline */}
            <div className="p-3 rounded-2xl border border-border bg-card">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold mb-2">Booking status</p>
              <ReservationStatusTimeline status={reservationStatus} />
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-muted-foreground">Room</span><span className="font-semibold">{roomName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span className="font-medium">{checkIn}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span className="font-medium">{checkOut}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Guests</span><span className="font-medium">{adults + children}</span></div>
              <div className="flex justify-between border-t border-border/50 pt-2 mt-1.5">
                <span className="font-bold text-sm">Total</span>
                <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">{fmtMoney(breakdown.total)}</span>
              </div>
            </div>

            {/* Payment badge (live via realtime) — compact summary above the inline payment card. */}
            {liveReservation?.payment_status && liveReservation.payment_status !== "unpaid" && (
              <div className="flex justify-center">
                <LodgingPaymentBadge
                  status={liveReservation.payment_status}
                  amountCents={liveReservation.deposit_cents || liveReservation.total_cents}
                  onRetry={handleRetryPayment}
                />
              </div>
            )}

            {/* Inline payment hub — handles card, Apple/Google Pay (via Stripe), and cash inline.
                Stays mounted through succeeded/failed terminal states so users see receipt or recovery
                actions without leaving the booking sheet. */}
            {payMethod === "card_on_arrival" && reservationId && (
              <LodgingEmbeddedCheckout
                reservationId={reservationId}
                storeId={storeId}
                amountCents={securityDeposit > 0 ? securityDeposit : breakdown.total}
                mode={securityDeposit > 0 ? "deposit" : "full"}
                method={inlineMethod}
                onMethodChange={setInlineMethod}
                paymentStatus={liveReservation?.payment_status}
                lastPaymentError={(liveReservation as any)?.last_payment_error || null}
                cardBrand={(liveReservation as any)?.card_brand || null}
                cardLast4={(liveReservation as any)?.card_last4 || null}
                reservationRef={reference}
                onComplete={() => toast.success("Card authorised — your booking is locked in.")}
              />
            )}

            {payMethod === "khqr" && reservationId && (
              <KHQRPaymentModal
                open={khqrOpen}
                onOpenChange={setKhqrOpen}
                amount={breakdown.total / 100}
                currency="USD"
                description={`Booking ${reference} · ${storeName}`}
                reference={reference || undefined}
                sourceTable="lodge_reservations"
                sourceId={reservationId}
                onSuccess={async () => {
                  await (supabase as any).from("lodge_reservations")
                    .update({ payment_status: "paid" })
                    .eq("id", reservationId);
                }}
              />
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={copyRef}>
                <Copy className="h-3.5 w-3.5" /> Copy ref
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={shareBooking}>
                <Share2 className="h-3.5 w-3.5" /> Share
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={openChatWithHost}>
                <MessageCircle className="h-3.5 w-3.5" /> Chat
              </Button>
            </div>

            <div className="space-y-2">
              <IcsPreviewPanel
                defaults={{
                  reference,
                  storeName,
                  roomName,
                  storePhone: storePhone || null,
                  storeUrl: typeof window !== "undefined" ? window.location.href : null,
                  guestName: name,
                  guestEmail: email || null,
                  checkIn,
                  checkOut,
                  defaultAddress: (propertyProfile as any)?.address || "",
                  defaultCheckInTime: (propertyProfile as any)?.check_in_from || "15:00",
                  defaultCheckOutTime: (propertyProfile as any)?.check_out_until || "11:00",
                  defaultTimezone: (propertyProfile as any)?.timezone || "Asia/Phnom_Penh",
                  totalText: fmtMoney(breakdown.total),
                  cancellationText: cancellationDescription(cancellationPolicy),
                  lockHours: Number((houseRules as any)?.ics_lock_hours ?? 24),
                }}
              />
              {storePhone ? (
                <a href={`tel:${storePhone}`} className="block">
                  <Button variant="outline" className="gap-1.5 w-full">
                    <MessageCircle className="h-4 w-4" /> Contact host
                  </Button>
                </a>
              ) : (
                <Button variant="outline" className="gap-1.5 w-full" disabled>
                  <MessageCircle className="h-4 w-4" /> Contact host
                </Button>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              You'll receive a confirmation once {storeName} accepts your request. Keep your reference handy for check-in.
            </p>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
}

type Breakdown = ReturnType<typeof buildBreakdownType>;
function buildBreakdownType() {
  return null as unknown as {
    nights: number;
    totalGuests: number;
    roomTotal: number;
    weekendUplift: number;
    discountPct: number;
    discountCents: number;
    roomAfter: number;
    addonsTotal: number;
    addonsSnapshot: { name: string; price_cents: number; per: string; qty: number; subtotal_cents: number; icon?: string; category?: string }[];
    extraGuestTotal: number;
    extraAdultFee: number;
    extraChildFee: number;
    cityTax: number;
    resortFee: number;
    cleaningFee: number;
    serviceCharge: number;
    vat: number;
    feesTotal: number;
    total: number;
    feeBreakdown: Record<string, number>;
  };
}

function PriceSummary({ breakdown, fmt }: { breakdown: Breakdown; fmt: (c: number) => string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/60 text-xs space-y-1 shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground inline-flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5 text-foreground dark:text-foreground shrink-0" />
          Room · {breakdown.nights} night{breakdown.nights > 1 ? "s" : ""}
        </span>
        <span className="font-semibold tabular-nums">{fmt(breakdown.roomTotal - breakdown.weekendUplift)}</span>
      </div>
      {breakdown.weekendUplift > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Sun className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            Weekend uplift
          </span>
          <span className="tabular-nums">{fmt(breakdown.weekendUplift)}</span>
        </div>
      )}
      {breakdown.discountCents > 0 && (
        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <BadgePercent className="h-3.5 w-3.5 shrink-0" />
            Discount ({breakdown.discountPct}%)
          </span>
          <span className="tabular-nums">−{fmt(breakdown.discountCents)}</span>
        </div>
      )}
      {breakdown.addonsSnapshot.map((a, i) => (
        <div key={i} className="flex justify-between items-center">
          <span className="text-muted-foreground truncate pr-2 inline-flex items-center gap-1.5">
            {a.icon
              ? <AddonIcon slug={a.icon} className="h-3.5 w-3.5 text-foreground dark:text-foreground shrink-0" />
              : <Sparkles className="h-3.5 w-3.5 text-foreground dark:text-foreground shrink-0" />}
            <span className="truncate">{a.name} ({a.per === "stay" ? "stay" : `${a.qty}× ${a.per === "person_night" ? "guest/night" : a.per}`})</span>
          </span>
          <span className="tabular-nums shrink-0">{fmt(a.subtotal_cents)}</span>
        </div>
      ))}
      {breakdown.extraAdultFee > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5 text-orange-500 shrink-0" />
            Extra adult fee
          </span>
          <span className="tabular-nums">{fmt(breakdown.extraAdultFee)}</span>
        </div>
      )}
      {breakdown.extraChildFee > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Baby className="h-3.5 w-3.5 text-foreground shrink-0" />
            Extra child fee
          </span>
          <span className="tabular-nums">{fmt(breakdown.extraChildFee)}</span>
        </div>
      )}
      {breakdown.cleaningFee > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-foreground dark:text-foreground shrink-0" />
            Cleaning fee
          </span>
          <span className="tabular-nums">{fmt(breakdown.cleaningFee)}</span>
        </div>
      )}
      {breakdown.resortFee > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Building className="h-3.5 w-3.5 text-foreground dark:text-foreground shrink-0" />
            Resort fee
          </span>
          <span className="tabular-nums">{fmt(breakdown.resortFee)}</span>
        </div>
      )}
      {breakdown.cityTax > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-foreground dark:text-foreground shrink-0" />
            City tax
          </span>
          <span className="tabular-nums">{fmt(breakdown.cityTax)}</span>
        </div>
      )}
      {breakdown.serviceCharge > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <ConciergeBell className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            Service charge
          </span>
          <span className="tabular-nums">{fmt(breakdown.serviceCharge)}</span>
        </div>
      )}
      {breakdown.vat > 0 && (
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Receipt className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 shrink-0" />
            VAT
          </span>
          <span className="tabular-nums">{fmt(breakdown.vat)}</span>
        </div>
      )}
      <div className="flex justify-between items-center border-t-2 border-dashed border-border/70 pt-2 mt-2">
        <span className="font-bold text-sm inline-flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          Grand total
        </span>
        <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(breakdown.total)}</span>
      </div>
    </div>
  );
}
