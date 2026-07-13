import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format, differenceInCalendarDays, parseISO, isValid, addDays } from "date-fns";
import {
  ArrowLeft, Hotel, CalendarRange, Users, CreditCard, Banknote,
  MapPin, Loader2, CheckCircle, ChevronRight, Shield, Info,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { useUserProfile } from "@/hooks/useUserProfile";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { CountryPhoneInput } from "@/components/auth/CountryPhoneInput";
import { LodgingEmbeddedCheckout } from "@/components/lodging/LodgingEmbeddedCheckout";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";

const parseParamDate = (s: string | null) => {
  if (!s) return null;
  const d = parseISO(s);
  return isValid(d) ? d : null;
};

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

type PayMethod = "cash" | "card";
type CheckoutReservation = {
  id: string;
  number: string | null;
  status: string | null;
  payment_status: string | null;
  last_payment_error?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
};

const ONLINE_PAYMENT_SUCCESS = new Set(["authorized", "captured", "paid"]);

const firstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
};

const normalizeAccountPhone = (value: string) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (value.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("855")) return `+${digits}`;
  if (/^0?\d{8,9}$/.test(digits)) return `+855${digits.replace(/^0/, "")}`;
  return `+${digits}`;
};

export default function HotelRoomCheckoutPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { format: formatCurrency } = useCurrency();
  const formatPrice = (cents: number) => cents > 0 ? formatCurrency(cents / 100, "USD") : "—";

  const roomId = params.get("room") || "";
  const reservationIdParam = params.get("reservation_id") || "";
  const checkIn = parseParamDate(params.get("ci")) ?? today();
  const checkOut = parseParamDate(params.get("co")) ?? addDays(today(), 1);
  const adults = Number(params.get("adults")) || 2;
  const children = Number(params.get("children")) || 0;
  const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));

  // Load store
  const storeQ = useQuery({
    queryKey: ["hotel-checkout-store", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, logo_url")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string; address: string | null; logo_url: string | null } | null;
    },
    enabled: !!storeId,
  });

  // Load rooms
  const roomsQ = useLodgeRooms(storeId);
  const room = useMemo(
    () => (roomsQ.data || []).find((r) => r.id === roomId) ?? null,
    [roomsQ.data, roomId],
  );

  // Price calc
  const basePerNight = room?.base_rate_cents ?? 0;
  const originalPerNight = room?.original_rate_cents ?? null;
  const hasDiscount = !!originalPerNight && originalPerNight > basePerNight;
  const discountPct = hasDiscount && originalPerNight ? Math.round(((originalPerNight - basePerNight) / originalPerNight) * 100) : 0;
  const subtotalCents = basePerNight * nights;
  const taxPct = (room?.fees?.vat_pct ?? 10);
  const taxCents = Math.round(subtotalCents * taxPct / 100);
  const totalCents = subtotalCents + taxCents + (room?.fees?.cleaning_fee_cents ?? 0);

  // Form state
  const [name, setName] = useState("");
  // Default to Cambodia dial code so the user lands on a sensible country
  // without having to open the picker. They can still switch via the flag
  // dropdown.
  const [phone, setPhone] = useState("+855");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutReservation, setCheckoutReservation] = useState<CheckoutReservation | null>(null);
  const guestFieldTouchedRef = useRef({ name: false, phone: false, email: false });
  const paymentSectionRef = useRef<HTMLDivElement | null>(null);
  const paymentSuccessToastRef = useRef<string | null>(null);

  const isLoading = storeQ.isLoading || roomsQ.isLoading;
  const onlinePaymentDone = ONLINE_PAYMENT_SUCCESS.has(checkoutReservation?.payment_status || "");
  const accountGuestDetails = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const accountPhone = firstNonEmptyString(userProfile?.phone, metadata.phone, metadata.phone_number);

    return {
      name: firstNonEmptyString(userProfile?.full_name, metadata.full_name, metadata.name),
      phone: normalizeAccountPhone(accountPhone),
      email: firstNonEmptyString(userProfile?.email, user?.email, metadata.email),
    };
  }, [user?.email, user?.user_metadata, userProfile?.email, userProfile?.full_name, userProfile?.phone]);
  const hasAccountGuestDetails = Boolean(accountGuestDetails.name || accountGuestDetails.phone || accountGuestDetails.email);

  useEffect(() => {
    if (!checkoutReservation?.id) return;

    let cancelled = false;
    const refreshReservation = async () => {
      const { data } = await (supabase as any)
        .from("lodge_reservations")
        .select("id, number, status, payment_status, last_payment_error, card_brand, card_last4")
        .eq("id", checkoutReservation.id)
        .maybeSingle();
      if (!cancelled && data) setCheckoutReservation(data as CheckoutReservation);
    };

    refreshReservation();
    const channel = supabase
      .channel(`hotel-checkout-reservation-${checkoutReservation.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "lodge_reservations", filter: `id=eq.${checkoutReservation.id}` },
        (payload) => {
          setCheckoutReservation((prev) => prev ? { ...prev, ...(payload.new as Partial<CheckoutReservation>) } : prev);
        },
      )
      .subscribe();

    const pollId = window.setInterval(refreshReservation, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [checkoutReservation?.id]);

  useEffect(() => {
    if (!reservationIdParam || reservationIdParam === checkoutReservation?.id || !storeId) return;

    let cancelled = false;
    const restoreReservation = async () => {
      const { data } = await (supabase as any)
        .from("lodge_reservations")
        .select("id, number, status, payment_status, last_payment_error, card_brand, card_last4")
        .eq("id", reservationIdParam)
        .eq("store_id", storeId)
        .maybeSingle();
      if (cancelled || !data) return;
      setPayMethod("card");
      setCheckoutReservation(data as CheckoutReservation);
    };

    restoreReservation();
    return () => {
      cancelled = true;
    };
  }, [checkoutReservation?.id, reservationIdParam, storeId]);

  useEffect(() => {
    if (!checkoutReservation?.id) return;
    requestAnimationFrame(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [checkoutReservation?.id]);

  useEffect(() => {
    if (!checkoutReservation?.id || !onlinePaymentDone) return;
    if (paymentSuccessToastRef.current === checkoutReservation.id) return;
    paymentSuccessToastRef.current = checkoutReservation.id;
    toast.success("Payment received. Your booking is confirmed.");
  }, [checkoutReservation?.id, onlinePaymentDone]);

  useEffect(() => {
    if (accountGuestDetails.name && !guestFieldTouchedRef.current.name && !name.trim()) {
      setName(accountGuestDetails.name);
    }
    if (accountGuestDetails.phone && !guestFieldTouchedRef.current.phone && (!phone.trim() || phone.trim() === "+855")) {
      setPhone(accountGuestDetails.phone);
    }
    if (accountGuestDetails.email && !guestFieldTouchedRef.current.email && !email.trim()) {
      setEmail(accountGuestDetails.email);
    }
  }, [accountGuestDetails, email, name, phone]);

  const handleConfirm = async () => {
    if (payMethod === "card" && checkoutReservation?.id) {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    // CountryPhoneInput always carries a leading "+<dial>" — require enough
    // digits beyond it to qualify as a real number.
    const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (phoneDigits.length < 7) { toast.error("Please enter a valid phone number"); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (payMethod === "card" && !user) {
        toast.error("Please sign in to pay online securely in the app.");
        return;
      }

      const ciStr = format(checkIn, "yyyy-MM-dd");
      const coStr = format(checkOut, "yyyy-MM-dd");

      // Last-mile availability check: re-query active reservations for this room
      // and abort if the dates overlap (prevents double-booking after the user
      // sat on the checkout page).
      if (roomId) {
        const { data: clashes } = await (supabase as any)
          .from("lodge_reservations")
          .select("id, check_in, check_out, status")
          .eq("room_id", roomId)
          .gt("check_out", ciStr)
          .lt("check_in", coStr)
          .not("status", "in", "(cancelled,no_show)");
        if ((clashes || []).length > 0) {
          toast.error("This room is no longer available for the selected dates. Please pick different dates or another room.");
          setSubmitting(false);
          return;
        }
      }

      // The `number` column on lodge_reservations is NOT NULL with no DB
      // default, so we generate the user-facing reservation code here. Format
      // matches existing rows: `RES-` + 6-digit random.
      const reservationNumber = `RES-${String(Math.floor(100000 + Math.random() * 900000))}`;

      const payload: any = {
        store_id: storeId,
        room_id: roomId || null,
        number: reservationNumber,
        guest_id: user?.id ?? null,
        guest_name: name.trim(),
        guest_phone: phone.trim(),
        guest_email: email.trim() || null,
        adults,
        children,
        check_in: ciStr,
        check_out: coStr,
        status: payMethod === "cash" ? "confirmed" : "hold",
        source: "zivo_app",
        rate_cents: basePerNight,
        extras_cents: 0,
        tax_cents: taxCents,
        total_cents: totalCents,
        paid_cents: 0,
        payment_status: payMethod === "cash" ? "pending_cash" : "pending",
        payment_provider: payMethod === "cash" ? "cash" : "stripe",
        notes: notes.trim() || null,
      };

      const { data: res, error } = await (supabase as any)
        .from("lodge_reservations")
        .insert(payload)
        .select("id, number")
        .single();

      if (error) throw error;

      if (payMethod === "card") {
        const nextParams = new URLSearchParams(params);
        nextParams.set("reservation_id", res.id);
        setSearchParams(nextParams, { replace: true });
        setCheckoutReservation({
          id: res.id,
          number: res.number,
          status: "hold",
          payment_status: "pending",
          last_payment_error: null,
          card_brand: null,
          card_last4: null,
        });
        toast.success("Booking held. Complete secure payment below.");
        return;
      }

      toast.success("Booking confirmed!");
      navigate(`/hotel/${storeId}/booking-confirmed?reservation_id=${res.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  const store = storeQ.data;
  // photos can be a string[] OR an array of objects ({url, order, source, ...})
  // depending on import vintage. Extract the URL safely so we don't end up with
  // src="[object Object]" and a broken image.
  const rawPhoto = (room?.photos as unknown[] | undefined)?.[room?.cover_photo_index ?? 0]
    ?? (room?.photos as unknown[] | undefined)?.[0];
  const photo: string | null =
    typeof rawPhoto === "string"
      ? rawPhoto
      : rawPhoto && typeof rawPhoto === "object"
        ? ((rawPhoto as Record<string, unknown>).url
            ?? (rawPhoto as Record<string, unknown>).src
            ?? (rawPhoto as Record<string, unknown>).path
            ?? null) as string | null
        : null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <SEOHead
        title="Hotel Booking – Complete Your Reservation – ZIVO"
        description="Complete your hotel reservation securely. Review pricing, confirm details, and book your stay with flexible payment options."
      />
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <button type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="h-10 w-10 rounded-full bg-foreground/5 border border-border flex items-center justify-center active:scale-95 hover:bg-foreground/10 transition touch-manipulation"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ig-gradient truncate leading-tight">Confirm Booking</h1>
          {store && <p className="text-xs text-muted-foreground truncate mt-0.5">{store.name}</p>}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 text-[10px] font-bold">
          <Shield className="w-3 h-3" /> Secure
        </span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* Room summary card */}
        {isLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : room ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card overflow-hidden flex gap-0"
          >
            <div className="w-28 shrink-0 relative">
              {photo ? (
                <img src={photo} alt={room.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full min-h-[96px] bg-muted flex items-center justify-center">
                  <Hotel className="w-6 h-6 text-muted-foreground/40" />
                </div>
              )}
            </div>
            <div className="p-3 flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <p className="text-sm font-bold text-foreground truncate">{room.name}</p>
                {room.breakfast_included && (
                  <Badge variant="outline" className="text-[9px] shrink-0">Breakfast</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {room.beds || room.room_type || "Room"} · {room.max_guests} guests
              </p>
              {(hasDiscount || room.original_rate_cents) && (
                <div className="mt-1 flex items-center gap-2 text-[10px]">
                  {hasDiscount && originalPerNight ? (
                    <>
                      <span className="text-muted-foreground line-through">{formatPrice(originalPerNight)}</span>
                      <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 font-semibold">-{discountPct}%</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Original rate available</span>
                  )}
                </div>
              )}
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarRange className="w-3 h-3" />
                  {format(checkIn, "MMM d")} – {format(checkOut, "MMM d")}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {adults + children} guest{adults + children > 1 ? "s" : ""}
                </span>
              </div>
              {store?.address && (
                <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {store.address}
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive text-center">
            Room not found. Please go back and select a room.
          </div>
        )}

        {/* Dates strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-2"
        >
          {[
            { label: "Check-in", value: format(checkIn, "EEE, MMM d") },
            { label: "Check-out", value: format(checkOut, "EEE, MMM d") },
            { label: "Duration", value: `${nights} night${nights > 1 ? "s" : ""}` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-muted/30 border border-border p-2.5 text-center">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</p>
              <p className="text-[11px] font-bold mt-0.5 text-foreground">{item.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Guest info */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground">Guest Details</p>
              {hasAccountGuestDetails && (
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Filled from your customer account. You can edit it for this stay.
                </p>
              )}
            </div>
            {hasAccountGuestDetails ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle className="h-3 w-3" />
                From account
              </span>
            ) : profileLoading ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading account
              </span>
            ) : null}
          </div>
          <div className="space-y-2.5">
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Full name *</Label>
              <Input
                placeholder="John Doe"
                value={name}
                onChange={(e) => {
                  guestFieldTouchedRef.current.name = true;
                  setName(e.target.value);
                }}
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Phone number *</Label>
              <CountryPhoneInput
                value={phone}
                onChange={(value) => {
                  guestFieldTouchedRef.current.phone = true;
                  setPhone(value);
                }}
                name="guest_phone"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Email (optional)</Label>
              <Input
                placeholder="you@email.com"
                type="email"
                value={email}
                onChange={(e) => {
                  guestFieldTouchedRef.current.email = true;
                  setEmail(e.target.value);
                }}
                className="h-10 rounded-xl text-sm"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground mb-1 block">Special requests (optional)</Label>
              <Textarea
                placeholder="Early check-in, high floor, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
        </motion.div>

        {/* Price breakdown */}
        {room && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-4 space-y-2"
          >
            <p className="text-sm font-bold text-foreground">Price Breakdown</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{formatPrice(basePerNight)} × {nights} night{nights > 1 ? "s" : ""}</span>
                <span>{formatPrice(subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxes ({taxPct}%)</span>
                <span>{formatPrice(taxCents)}</span>
              </div>
              {(room.fees?.cleaning_fee_cents ?? 0) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Cleaning fee</span>
                  <span>{formatPrice(room.fees?.cleaning_fee_cents ?? 0)}</span>
                </div>
              )}
              <Separator className="my-1 bg-border/30" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">{formatPrice(totalCents)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Payment method */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border bg-card p-4 space-y-3"
        >
          <p className="text-sm font-bold text-foreground">Payment Method</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "cash" as PayMethod, icon: Banknote, label: "Cash at hotel", sub: "Pay when you arrive" },
              { key: "card" as PayMethod, icon: CreditCard, label: "Pay online", sub: "Secure card payment" },
            ]).map(({ key, icon: Icon, label, sub }) => (
              <button type="button"
                key={key}
                onClick={() => setPayMethod(key)}
                className={cn(
                  "flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all",
                  payMethod === key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-border/70",
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("w-4 h-4", payMethod === key ? "text-primary" : "text-muted-foreground")} />
                  {payMethod === key && <CheckCircle className="w-3 h-3 text-primary ml-auto" />}
                </div>
                <p className={cn("text-[12px] font-semibold", payMethod === key ? "text-foreground" : "text-muted-foreground")}>
                  {label}
                </p>
                <p className="text-[10px] text-muted-foreground">{sub}</p>
              </button>
            ))}
          </div>
          {payMethod === "cash" && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Your room is reserved instantly. Pay the full amount at the front desk upon arrival.
            </p>
          )}
          {payMethod === "card" && (
            <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Pay inside ZIVO with the secure card form. We keep you in the app and confirm the reservation from Stripe webhooks.
            </p>
          )}
        </motion.div>

        {payMethod === "card" && checkoutReservation && (
          <motion.div
            ref={paymentSectionRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-3"
          >
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 space-y-3">
              <div className="flex items-start gap-2">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Step 2 of 2</p>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                      <Clock className="h-3 w-3" />
                      Room held
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">Finish secure card payment</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    Reservation {checkoutReservation.number || checkoutReservation.id.slice(0, 8)} is held for this room. Enter your card below; ZIVO confirms the booking automatically after Stripe approves it.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["1", "Room held"],
                  ["2", "Pay card"],
                  ["3", "Confirmed"],
                ].map(([step, label]) => (
                  <div key={step} className="rounded-xl bg-background/85 p-2 text-center ring-1 ring-emerald-500/15">
                    <div className="mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                      {step}
                    </div>
                    <p className="text-[10px] font-bold text-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <LodgingEmbeddedCheckout
              reservationId={checkoutReservation.id}
              storeId={storeId}
              amountCents={totalCents}
              mode="full"
              method="card"
              hideMethodToggle
              paymentStatus={checkoutReservation.payment_status}
              lastPaymentError={checkoutReservation.last_payment_error || null}
              cardBrand={checkoutReservation.card_brand || null}
              cardLast4={checkoutReservation.card_last4 || null}
              reservationRef={checkoutReservation.number}
              onComplete={() => toast.success("Payment submitted. Confirming with ZIVO…")}
            />

            {onlinePaymentDone && (
              <Button
                type="button"
                className="h-12 w-full rounded-2xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                onClick={() => navigate(`/hotel/${storeId}/booking-confirmed?reservation_id=${checkoutReservation.id}`)}
              >
                View confirmed booking
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Cancellation policy */}
        {room?.cancellation_policy && (
          <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-3 py-2.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-amber-700 dark:text-amber-400">Cancellation: </span>
            {room.cancellation_policy}
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pt-2"
        >
          <Button
            size="lg"
            className="w-full h-13 rounded-2xl font-bold gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
            disabled={submitting || !room || isLoading || (payMethod === "card" && !!checkoutReservation)}
            onClick={handleConfirm}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : payMethod === "card" && checkoutReservation ? (
              <>
                <CreditCard className="w-4 h-4" />
                Payment form ready below
              </>
            ) : payMethod === "card" ? (
              <>
                <CreditCard className="w-4 h-4" />
                Continue to in-app payment · {formatPrice(totalCents)}
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Confirm Booking
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Your booking is protected by ZIVO
          </p>
        </motion.div>

      </div>

      <ZivoMobileNav />
    </div>
  );
}
