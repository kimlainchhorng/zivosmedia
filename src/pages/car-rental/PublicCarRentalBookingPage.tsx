/**
 * PublicCarRentalBookingPage — customer-facing booking flow for a single
 * car-rental store. Mirrors the salon public booking flow.
 *
 * Route: /car-rental/:slug
 * Flow: pick location + dates → choose vehicle → choose add-ons → enter
 *       contact info → submit (creates a 'pending' / 'app'-sourced reservation).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { useStoreCurrency } from "@/lib/car-rental/money";
import { bestBaseTotal } from "@/lib/car-rental/pricing";
import { Helmet } from "react-helmet-async";
import {
  Car, CalendarRange, MapPin, Loader2, CheckCircle2, ChevronLeft, ChevronRight,
  Users, Fuel, Cog, Briefcase, Snowflake, AlertTriangle, Tag, Star, Heart, Search, Zap, ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CarRentalInlinePaymentForm from "@/components/car-rental/CarRentalInlinePaymentForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
}

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  open_time: string | null;
  close_time: string | null;
  is_default: boolean;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  category: string;
  transmission: "automatic" | "manual";
  fuel_type: string;
  seats: number;
  doors: number;
  luggage_capacity: number;
  air_conditioning: boolean;
  daily_rate_cents: number;
  weekly_rate_cents: number;
  monthly_rate_cents: number;
  mileage_limit_per_day: number | null;
  security_deposit_cents: number;
  photo_url: string | null;
  photo_urls: string[];
  description: string | null;
  features: string[];
  status: string;
}

interface Addon {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing: "per_day" | "per_rental";
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Step = "dates" | "vehicle" | "addons" | "details" | "review" | "payment" | "confirmed";

interface PaymentSession {
  reservationId: string;
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  currency: string;
  captureMode: "manual" | "immediate";
}
type Mode = "storefront" | "wizard";

export default function PublicCarRentalBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [publicReviews, setPublicReviews] = useState<{ rating: number; comment: string | null; customer_name: string; created_at: string }[]>([]);
  const [taxRateBps, setTaxRateBps] = useState<number>(0);
  const [taxLabel, setTaxLabel] = useState<string>("Tax");
  const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null);
  const { format: formatMoney } = useStoreCurrency(store?.id);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [bookedNow, setBookedNow] = useState<Set<string>>(new Set());
  const [popularIds, setPopularIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("storefront");
  const [step, setStep] = useState<Step>("dates");
  const [pickupLocationId, setPickupLocationId] = useState<string>("");
  const [dropoffLocationId, setDropoffLocationId] = useState<string>("");
  const [pickupDate, setPickupDate] = useState<string>(addDays(todayIso(), 1));
  const [pickupTime, setPickupTime] = useState<string>("10:00");
  const [dropoffDate, setDropoffDate] = useState<string>(addDays(todayIso(), 4));
  const [dropoffTime, setDropoffTime] = useState<string>("10:00");

  const [vehicleId, setVehicleId] = useState<string>("");
  const [selectedAddons, setSelectedAddons] = useState<Map<string, number>>(new Map());

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [notes, setNotes] = useState("");

  // Promo code state — pre-filled from `?promo=<CODE>` query parameter when present
  // (e.g. from a share link generated in the admin Promotions section).
  const initialPromo = (() => {
    if (typeof window === "undefined") return "";
    try { return new URLSearchParams(window.location.search).get("promo")?.toUpperCase() ?? ""; }
    catch { return ""; }
  })();
  const [promoCodeInput, setPromoCodeInput] = useState(initialPromo);
  const [appliedPromo, setAppliedPromo] = useState<{ id: string; code: string; kind: "percent" | "flat"; amount: number; description: string | null } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // When the storefront mounts with `?promo=...`, start in the wizard so the
  // renter sees the code they were invited with and can complete the booking.
  useEffect(() => {
    if (initialPromo) setMode("wizard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [promoChecking, setPromoChecking] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const clientAttemptIdRef = useRef<string>(
    typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) { setError("Missing store slug"); setLoading(false); return; }
      setLoading(true);
      // Resolve store
      const { data: storeRow, error: storeErr } = await supabase
        .from("store_profiles")
        .select("id,name,slug,logo_url,cover_image_url,description,city,state,category")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (storeErr || !storeRow) {
        setError("Rental store not found.");
        setLoading(false);
        return;
      }
      setStore(storeRow as unknown as StoreInfo);

      const [locsR, vehsR, addonsR, reviewsR, settingsR] = await Promise.all([
        supabase.from("car_rental_locations").select("*").eq("store_id", (storeRow as any).id).eq("is_active", true).order("is_default", { ascending: false }),
        supabase.from("car_rental_vehicles").select("*").eq("store_id", (storeRow as any).id).eq("is_active", true).neq("status", "retired"),
        supabase.from("car_rental_addons").select("*").eq("store_id", (storeRow as any).id).eq("is_active", true).order("sort_order"),
        supabase.from("car_rental_reviews").select("rating, comment, customer_name, created_at").eq("store_id", (storeRow as any).id).eq("is_published", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("car_rental_store_settings").select("tax_rate_bps, tax_label, cancellation_policy").eq("store_id", (storeRow as any).id).maybeSingle(),
      ]);
      if (cancelled) return;
      const locs = (locsR.data ?? []) as unknown as Location[];
      setLocations(locs);
      setVehicles((vehsR.data ?? []) as unknown as Vehicle[]);
      setAddons((addonsR.data ?? []) as unknown as Addon[]);
      setPublicReviews((reviewsR.data ?? []) as unknown as typeof publicReviews);
      if (settingsR.data) {
        setTaxRateBps((settingsR.data as any).tax_rate_bps ?? 0);
        setTaxLabel((settingsR.data as any).tax_label ?? "Tax");
        setCancellationPolicy((settingsR.data as any).cancellation_policy ?? null);
      }
      const def = locs.find((l) => l.is_default) ?? locs[0];
      if (def) {
        setPickupLocationId(def.id);
        setDropoffLocationId(def.id);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Compute "popular" vehicles — top 3 by completed-rental count over the last 90 days.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("car_rental_reservations")
        .select("vehicle_id, status")
        .eq("store_id", store.id)
        .in("status", ["returned", "picked_up"])
        .gte("pickup_at", cutoff)
        .limit(500);
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as Array<{ vehicle_id: string | null }>) {
        if (!r.vehicle_id) continue;
        counts.set(r.vehicle_id, (counts.get(r.vehicle_id) ?? 0) + 1);
      }
      // Pick the top 3 with at least 2 rentals to avoid tagging a brand-new fleet.
      const sorted = Array.from(counts.entries())
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id);
      setPopularIds(new Set(sorted));
    })();
    return () => { cancelled = true; };
  }, [store]);

  // Compute the "booked-right-now" set for the storefront's "Available now" chips.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    (async () => {
      const now = new Date().toISOString();
      const [resR, blackR] = await Promise.all([
        supabase
          .from("car_rental_reservations")
          .select("vehicle_id, pickup_at, dropoff_at, status")
          .eq("store_id", store.id)
          .in("status", ["picked_up", "confirmed"])
          .lt("pickup_at", now)
          .gt("dropoff_at", now),
        supabase
          .from("car_rental_vehicle_blackouts")
          .select("vehicle_id, starts_at, ends_at")
          .eq("store_id", store.id)
          .lt("starts_at", now)
          .gt("ends_at", now),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      for (const r of (resR.data ?? []) as Array<{ vehicle_id: string | null }>) {
        if (r.vehicle_id) set.add(r.vehicle_id);
      }
      for (const b of (blackR.data ?? []) as Array<{ vehicle_id: string | null }>) {
        if (b.vehicle_id) set.add(b.vehicle_id);
      }
      setBookedNow(set);
    })();
    return () => { cancelled = true; };
  }, [store]);

  // Compute conflicts: vehicles unavailable due to overlapping reservations OR
  // active blackout windows during the chosen dates.
  useEffect(() => {
    if (!store) return;
    if (vehicles.length === 0) return;
    let cancelled = false;
    (async () => {
      const pickupAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
      const dropoffAt = new Date(`${dropoffDate}T${dropoffTime}:00`).toISOString();
      const [resR, blackR] = await Promise.all([
        supabase
          .from("car_rental_reservations")
          .select("vehicle_id, pickup_at, dropoff_at, status")
          .eq("store_id", store.id)
          .in("status", ["pending", "confirmed", "picked_up"])
          .lt("pickup_at", dropoffAt)
          .gt("dropoff_at", pickupAt),
        supabase
          .from("car_rental_vehicle_blackouts")
          .select("vehicle_id, starts_at, ends_at")
          .eq("store_id", store.id)
          .lt("starts_at", dropoffAt)
          .gt("ends_at", pickupAt),
      ]);
      if (cancelled) return;
      const set = new Set<string>();
      for (const r of (resR.data ?? []) as Array<{ vehicle_id: string | null }>) {
        if (r.vehicle_id) set.add(r.vehicle_id);
      }
      for (const b of (blackR.data ?? []) as Array<{ vehicle_id: string | null }>) {
        if (b.vehicle_id) set.add(b.vehicle_id);
      }
      setConflicts(set);
    })();
    return () => { cancelled = true; };
  }, [store, vehicles, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const pickupAt = useMemo(() => new Date(`${pickupDate}T${pickupTime}:00`), [pickupDate, pickupTime]);
  const dropoffAt = useMemo(() => new Date(`${dropoffDate}T${dropoffTime}:00`), [dropoffDate, dropoffTime]);
  const validRange = dropoffAt.getTime() > pickupAt.getTime();
  const rentalDays = validRange ? Math.max(1, Math.ceil((dropoffAt.getTime() - pickupAt.getTime()) / (24 * 60 * 60 * 1000))) : 0;

  const availableVehicles = useMemo(() => vehicles.filter((v) => !conflicts.has(v.id)), [vehicles, conflicts]);
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;

  const pricing = selectedVehicle ? bestBaseTotal({
    daily_rate_cents: selectedVehicle.daily_rate_cents,
    weekly_rate_cents: selectedVehicle.weekly_rate_cents,
    monthly_rate_cents: selectedVehicle.monthly_rate_cents,
  }, rentalDays) : null;
  const baseTotal = pricing?.base_total_cents ?? 0;
  const addonsTotal = useMemo(() => {
    let sum = 0;
    for (const a of addons) {
      const qty = selectedAddons.get(a.id) ?? 0;
      if (qty > 0) sum += a.billing === "per_day" ? a.price_cents * qty * rentalDays : a.price_cents * qty;
    }
    return sum;
  }, [addons, selectedAddons, rentalDays]);
  const securityDeposit = selectedVehicle?.security_deposit_cents ?? 0;

  // Discount calculation (applies to base + addons, not deposit)
  const discountableAmount = baseTotal + addonsTotal;
  const discountCents = !appliedPromo ? 0
    : appliedPromo.kind === "percent"
      ? Math.round(discountableAmount * (appliedPromo.amount / 100))
      : Math.min(appliedPromo.amount, discountableAmount);

  // Apply store tax to (base + addons − discount). Deposit is excluded from tax.
  const taxableAmount = Math.max(0, baseTotal + addonsTotal - discountCents);
  const taxesCents = Math.round(taxableAmount * (taxRateBps / 10000));
  const total = baseTotal + addonsTotal + securityDeposit + taxesCents - discountCents;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
      return next;
    });
  };

  const setAddonQty = (id: string, qty: number) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(id);
      else next.set(id, Math.min(10, qty));
      return next;
    });
  };

  const applyPromoCode = async () => {
    if (!store || !promoCodeInput.trim()) return;
    setPromoChecking(true);
    setPromoError(null);
    const code = promoCodeInput.trim().toUpperCase();
    const nowIso = new Date().toISOString();
    const { data, error: err } = await supabase
      .from("car_rental_promotions")
      .select("id, code, kind, amount, description, min_rental_days, min_amount_cents, max_redemptions, current_redemptions, starts_at, ends_at, is_active")
      .eq("store_id", store.id)
      .ilike("code", code)
      .maybeSingle();
    if (err || !data) {
      setPromoError("Code not found.");
      setPromoChecking(false);
      return;
    }
    const p = data as any;
    if (!p.is_active) { setPromoError("That code is not active."); setPromoChecking(false); return; }
    if (p.starts_at && p.starts_at > nowIso) { setPromoError("That code is not yet active."); setPromoChecking(false); return; }
    if (p.ends_at && p.ends_at < nowIso) { setPromoError("That code has expired."); setPromoChecking(false); return; }
    if (p.max_redemptions !== null && p.current_redemptions >= p.max_redemptions) { setPromoError("That code is fully redeemed."); setPromoChecking(false); return; }
    if (rentalDays < p.min_rental_days) { setPromoError(`Minimum ${p.min_rental_days} day${p.min_rental_days === 1 ? "" : "s"} required.`); setPromoChecking(false); return; }
    if (discountableAmount < p.min_amount_cents) { setPromoError(`Minimum spend ${formatMoney(p.min_amount_cents)} required.`); setPromoChecking(false); return; }
    setAppliedPromo({ id: p.id, code: p.code, kind: p.kind, amount: p.amount, description: p.description });
    setPromoChecking(false);
  };
  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError(null);
  };

  const goNext = () => {
    setError(null);
    if (step === "dates") {
      if (!validRange) { setError("Drop-off must be after pickup."); return; }
      setStep("vehicle");
    } else if (step === "vehicle") {
      if (!vehicleId) { setError("Please pick a vehicle."); return; }
      setStep(addons.length > 0 ? "addons" : "details");
    } else if (step === "addons") {
      setStep("details");
    } else if (step === "details") {
      if (!name.trim() || !phone.trim()) { setError("Please enter your name and phone."); return; }
      setStep("review");
    }
  };
  const goBack = () => {
    setError(null);
    if (step === "vehicle") setStep("dates");
    else if (step === "addons") setStep("vehicle");
    else if (step === "details") setStep(addons.length > 0 ? "addons" : "vehicle");
    else if (step === "review") setStep("details");
  };

  const submit = async () => {
    if (!store || !selectedVehicle) return;
    setSubmitting(true);
    setError(null);
    const pickupLoc = locations.find((l) => l.id === pickupLocationId);
    const dropoffLoc = locations.find((l) => l.id === dropoffLocationId);
    const payload = {
      store_id: store.id,
      vehicle_id: selectedVehicle.id,
      pickup_location_id: pickupLoc?.id ?? null,
      dropoff_location_id: dropoffLoc?.id ?? null,
      vehicle_label: `${selectedVehicle.year ? `${selectedVehicle.year} ` : ""}${selectedVehicle.make} ${selectedVehicle.model}`,
      vehicle_category: selectedVehicle.category,
      customer_name: name.trim(),
      customer_phone: phone.trim() || null,
      customer_email: email.trim() || null,
      pickup_location_name: pickupLoc?.name ?? null,
      dropoff_location_name: dropoffLoc?.name ?? null,
      pickup_at: pickupAt.toISOString(),
      dropoff_at: dropoffAt.toISOString(),
      rental_days: rentalDays,
      daily_rate_cents: selectedVehicle.daily_rate_cents,
      base_total_cents: baseTotal,
      security_deposit_cents: securityDeposit,
      discount_cents: discountCents,
      taxes_cents: taxesCents,
      total_cents: total,
      status: "pending" as const,
      source: "app" as const,
      customer_notes: notes.trim() || null,
    };
    const { data, error: err } = await supabase
      .from("car_rental_reservations")
      .insert(payload as never)
      .select("confirmation_code, id")
      .single();
    if (err) {
      console.error(err);
      if ((err as any).code === "23P01") {
        setError("That vehicle was just booked by someone else. Please pick another vehicle.");
        setStep("vehicle");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    // Promo redemption record
    if (appliedPromo && (data as any)?.id) {
      await supabase.from("car_rental_promo_redemptions").insert({
        store_id: store.id,
        promo_id: appliedPromo.id,
        reservation_id: (data as any).id,
        amount_discounted_cents: discountCents,
      } as never);
    }

    // Add-on rows (snapshot)
    const selected = addons.filter((a) => selectedAddons.has(a.id));
    if (selected.length > 0 && (data as any)?.id) {
      const rows = selected.map((a) => {
        const qty = selectedAddons.get(a.id) ?? 1;
        const itemTotal = a.billing === "per_day" ? a.price_cents * qty * rentalDays : a.price_cents * qty;
        return {
          reservation_id: (data as any).id,
          addon_id: a.id,
          name: a.name,
          unit_price_cents: a.price_cents,
          billing: a.billing,
          quantity: qty,
          total_cents: itemTotal,
        };
      });
      await supabase.from("car_rental_reservation_addons").insert(rows as never);
    }

    const reservationId = (data as any).id as string;
    setSubmittedCode((data as any).confirmation_code);

    // Kick off the Stripe deposit PaymentIntent. If the store is wired up
    // for payments, we move to the inline payment step. If anything goes
    // wrong (e.g. payments not configured), we fall back to the legacy
    // "Booking received!" confirmation so the rental team can still handle
    // payment manually offline.
    try {
      const { data: depositRes, error: depositErr } = await supabase.functions.invoke(
        "create-car-rental-deposit",
        {
          body: {
            reservation_id: reservationId,
            client_attempt_id: clientAttemptIdRef.current,
          },
        },
      );

      if (depositErr) throw depositErr;
      const dep = depositRes as any;

      if (dep?.already_paid) {
        setStep("confirmed");
      } else if (dep?.client_secret && dep?.payment_intent_id) {
        setPaymentSession({
          reservationId,
          clientSecret: dep.client_secret,
          paymentIntentId: dep.payment_intent_id,
          amountCents: dep.amount_cents,
          currency: dep.currency || "usd",
          captureMode: dep.capture_mode === "immediate" ? "immediate" : "manual",
        });
        setStep("payment");
      } else {
        // Payments not configured for this store — keep the legacy flow.
        setStep("confirmed");
      }
    } catch (e) {
      console.error("[create-car-rental-deposit] failed", e);
      // Don't block the booking — it's already saved in DB. The team can
      // settle payment manually if Stripe is unavailable.
      setStep("confirmed");
    }

    setSubmitting(false);
  };

  // When the customer is on the payment step (or has just submitted payment),
  // subscribe to the reservation row and flip to "confirmed" as soon as the
  // Stripe webhook updates payment_status. Falls back to a 2-second poll if
  // Realtime is unavailable.
  useEffect(() => {
    if (!paymentSession) return;
    if (step !== "payment" && step !== "confirmed") return;

    const reservationId = paymentSession.reservationId;
    let cancelled = false;

    const handleStatus = (paymentStatus: string | null | undefined, statusVal: string | null | undefined) => {
      if (cancelled) return;
      if (paymentStatus === "authorized" || paymentStatus === "captured" || paymentStatus === "paid") {
        setStep("confirmed");
      } else if (paymentStatus === "failed") {
        setError("Payment was declined. Please try a different card.");
      }
    };

    const channel = supabase
      .channel(`car_rental_reservation_${reservationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "car_rental_reservations",
          filter: `id=eq.${reservationId}`,
        },
        (payload: any) => handleStatus(payload?.new?.payment_status, payload?.new?.status),
      )
      .subscribe();

    // Polling fallback (handles the case where Realtime isn't subscribed yet)
    const poll = window.setInterval(async () => {
      const { data } = await supabase
        .from("car_rental_reservations")
        .select("payment_status, status")
        .eq("id", reservationId)
        .maybeSingle();
      handleStatus((data as any)?.payment_status, (data as any)?.status);
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [paymentSession, step]);

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    // The webhook is the source of truth — we just wait for the subscription
    // above to flip the step to "confirmed". Optimistically advance the UI
    // after a short delay so even a delayed webhook doesn't leave the user
    // staring at "Processing…" forever.
    window.setTimeout(() => {
      setStep((cur) => (cur === "payment" ? "confirmed" : cur));
    }, 4000);
  };

  const handlePaymentCancel = () => {
    // User wants to step back to the review screen to make changes.
    // We keep the reservation row in place (status: pending) — it gets a
    // chance to be retried, or the rental team can cancel it manually.
    setStep("review");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Store not found</h1>
          <p className="mt-2 text-muted-foreground">The rental store you're looking for doesn't exist.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Book a car — {store.name}</title>
        <meta
          name="description"
          content={`Rent a car from ${store.name}${[store.city, store.state].filter(Boolean).length > 0 ? ` in ${[store.city, store.state].filter(Boolean).join(", ")}` : ""}. ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} available. Easy online booking, transparent pricing.`}
        />
        <link rel="canonical" href={`${typeof window !== "undefined" ? window.location.origin : ""}/car-rental/${store.slug}`} />
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${store.name} — Book a car`} />
        <meta
          property="og:description"
          content={store.description || `Rent a car from ${store.name}. ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} ready to book online.`}
        />
        {(store.cover_image_url || store.logo_url) && (
          <meta property="og:image" content={store.cover_image_url || store.logo_url || ""} />
        )}
        {/* Twitter card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${store.name} — Book a car`} />
        <meta
          name="twitter:description"
          content={store.description || `Rent a car from ${store.name}.`}
        />
        {(store.cover_image_url || store.logo_url) && (
          <meta name="twitter:image" content={store.cover_image_url || store.logo_url || ""} />
        )}
        {/* JSON-LD LocalBusiness — only when in storefront mode for crawlers */}
        {mode === "storefront" && (
          <script type="application/ld+json">{JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AutoRental",
            name: store.name,
            description: store.description ?? undefined,
            image: store.cover_image_url ?? store.logo_url ?? undefined,
            address: ([store.city, store.state].filter(Boolean).length > 0) ? {
              "@type": "PostalAddress",
              addressLocality: store.city ?? undefined,
              addressRegion: store.state ?? undefined,
            } : undefined,
            aggregateRating: publicReviews.length > 0 ? {
              "@type": "AggregateRating",
              ratingValue: (publicReviews.reduce((s, r) => s + r.rating, 0) / publicReviews.length).toFixed(1),
              reviewCount: publicReviews.length,
            } : undefined,
            offerCatalog: vehicles.length > 0 ? {
              "@type": "OfferCatalog",
              name: "Available vehicles",
              itemListElement: vehicles.slice(0, 20).map((v) => ({
                "@type": "Offer",
                itemOffered: {
                  "@type": "Vehicle",
                  name: `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}`,
                  vehicleTransmission: v.transmission,
                  fuelType: v.fuel_type,
                  numberOfDoors: v.doors,
                  seatingCapacity: v.seats,
                },
                priceCurrency: "USD",
                price: (v.daily_rate_cents / 100).toFixed(2),
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  unitCode: "DAY",
                  price: (v.daily_rate_cents / 100).toFixed(2),
                  priceCurrency: "USD",
                },
              })),
            } : undefined,
          })}</script>
        )}
      </Helmet>
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-foreground">{store.name}</h1>
            <p className="text-[11px] text-muted-foreground">
              {[store.city, store.state].filter(Boolean).join(", ") || "Car Rental"}
            </p>
          </div>
        </div>
      </header>

      {mode === "wizard" && step !== "confirmed" && (
        <div className="border-b border-border bg-card">
          <div className="mx-auto max-w-5xl px-4 py-2 flex gap-1.5 overflow-x-auto">
            {(["dates", "vehicle", "addons", "details", "review"] as Step[]).filter((s) => s !== "addons" || addons.length > 0).map((s, i, arr) => {
              const isActive = step === s;
              const isDone = arr.indexOf(step) > i;
              return (
                <div key={s} className={cn(
                  "flex-1 min-w-[60px] rounded-full px-2 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider",
                  isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                )}>
                  {s}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === "storefront" && (
        <Storefront
          store={store}
          vehicles={vehicles}
          locations={locations}
          reviews={publicReviews}
          bookedNow={bookedNow}
          popularIds={popularIds}
          onStartBooking={() => { setMode("wizard"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      )}

      {mode === "wizard" && <main className="mx-auto max-w-5xl px-4 py-5">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {step === "dates" && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="h-5 w-5 text-primary" /> Pickup & drop-off
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {locations.length > 1 && (
                <>
                  <Field label="Pickup location">
                    <Select value={pickupLocationId} onValueChange={(v) => { setPickupLocationId(v); if (!dropoffLocationId) setDropoffLocationId(v); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}{l.city ? ` · ${l.city}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Drop-off location">
                    <Select value={dropoffLocationId} onValueChange={setDropoffLocationId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}{l.city ? ` · ${l.city}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              )}
              {locations.length === 1 && (
                <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  Pickup & drop-off at <span className="font-semibold text-foreground">{locations[0].name}</span>
                </div>
              )}
              <Field label="Pickup date">
                <Input type="date" value={pickupDate} min={todayIso()} onChange={(e) => setPickupDate(e.target.value)} />
              </Field>
              <Field label="Pickup time">
                <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </Field>
              <Field label="Drop-off date">
                <Input type="date" value={dropoffDate} min={pickupDate} onChange={(e) => setDropoffDate(e.target.value)} />
              </Field>
              <Field label="Drop-off time">
                <Input type="time" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} />
              </Field>
              {validRange && (
                <div className="sm:col-span-2 rounded-lg bg-primary/8 px-3 py-2 text-sm font-semibold text-primary">
                  {rentalDays} day{rentalDays === 1 ? "" : "s"} rental
                </div>
              )}
              {(() => {
                const pickupLoc = locations.find((l) => l.id === pickupLocationId);
                const dropoffLoc = locations.find((l) => l.id === dropoffLocationId);
                const warns: string[] = [];
                const checkHours = (loc: Location | undefined, time: string, label: string) => {
                  if (!loc || !loc.open_time || !loc.close_time || !time) return;
                  if (time < loc.open_time.slice(0, 5) || time > loc.close_time.slice(0, 5)) {
                    warns.push(`${label} time ${time} is outside ${loc.name}'s open hours (${loc.open_time.slice(0, 5)} – ${loc.close_time.slice(0, 5)})`);
                  }
                };
                checkHours(pickupLoc, pickupTime, "Pickup");
                checkHours(dropoffLoc, dropoffTime, "Drop-off");
                if (warns.length === 0) return null;
                return (
                  <div className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-bold mb-0.5">⏰ Outside open hours</p>
                    {warns.map((w, i) => <p key={i}>{w}</p>)}
                    <p className="mt-1 text-[10px] opacity-80">The team may need to make special arrangements. Continue to book anyway.</p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {step === "vehicle" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {availableVehicles.length} of {vehicles.length} vehicles available {pickupDate} → {dropoffDate}
            </p>
            {vehicles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
                This rental store hasn't listed any vehicles yet.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {vehicles.map((v) => {
                  const isUnavailable = conflicts.has(v.id);
                  const isSelected = vehicleId === v.id;
                  // Suggest up to 2 available alternatives in the same category, sorted by closest daily rate.
                  const similar = isUnavailable
                    ? vehicles
                        .filter((x) => x.id !== v.id && !conflicts.has(x.id) && x.category === v.category)
                        .sort((a, b) => Math.abs(a.daily_rate_cents - v.daily_rate_cents) - Math.abs(b.daily_rate_cents - v.daily_rate_cents))
                        .slice(0, 2)
                    : [];
                  return (
                    <li key={v.id}>
                      <button type="button"
                        disabled={isUnavailable}
                        onClick={() => setVehicleId(v.id)}
                        className={cn(
                          "group w-full rounded-2xl border bg-card p-4 text-left transition-all",
                          isUnavailable ? "opacity-50 cursor-not-allowed border-border" :
                            isSelected ? "border-primary ring-2 ring-primary/30" :
                            "border-border hover:border-primary/40"
                        )}
                      >
                        {v.photo_url ? (
                          <img src={v.photo_url} alt="" className="mb-2 h-32 w-full rounded-xl object-cover" />
                        ) : (
                          <div className="mb-2 grid h-32 w-full place-items-center rounded-xl bg-muted">
                            <Car className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        {(v.photo_urls?.length ?? 0) > 0 && (
                          <div className="mb-3 flex gap-1">
                            {(v.photo_urls ?? []).slice(0, 4).map((u, i) => (
                              <img key={i} src={u} alt="" className="h-12 flex-1 rounded object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
                            ))}
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground">
                              {v.year ? `${v.year} ` : ""}{v.make} {v.model}
                            </p>
                            <p className="text-[11px] text-muted-foreground capitalize">{v.category} · {v.color || "—"}</p>
                          </div>
                          {isUnavailable && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Booked</span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{v.seats}</span>
                          <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{v.luggage_capacity}</span>
                          <span className="inline-flex items-center gap-1"><Cog className="h-3 w-3" />{v.transmission}</span>
                          <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3" />{v.fuel_type}</span>
                          {v.air_conditioning && <span className="inline-flex items-center gap-1"><Snowflake className="h-3 w-3" />AC</span>}
                        </div>
                        {Array.isArray(v.features) && v.features.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {v.features.slice(0, 4).map((f, i) => (
                              <span key={`${f}-${i}`} className="rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                {f}
                              </span>
                            ))}
                            {v.features.length > 4 && (
                              <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                +{v.features.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="mt-2 flex items-baseline justify-between">
                          <p className="text-xl font-bold text-foreground">{formatMoney(v.daily_rate_cents)}<span className="text-xs font-medium text-muted-foreground">/day</span></p>
                          {rentalDays > 0 && !isUnavailable && (
                            <p className="text-[11px] text-muted-foreground">
                              Total: <span className="font-bold text-foreground">{formatMoney(v.daily_rate_cents * rentalDays)}</span>
                            </p>
                          )}
                        </div>
                      </button>
                      {similar.length > 0 && (
                        <div className="mt-1.5 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                            Available alternatives:
                          </p>
                          <ul className="flex flex-wrap gap-1.5">
                            {similar.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => setVehicleId(s.id)}
                                  className="rounded-md border border-border bg-card px-2 py-1 text-[11px] hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                >
                                  {s.year ? `${s.year} ` : ""}{s.make} {s.model}{" "}
                                  <span className="font-bold text-primary">{formatMoney(s.daily_rate_cents)}/day</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {step === "addons" && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Extras & add-ons</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2">
                {addons.map((a) => {
                  const qty = selectedAddons.get(a.id) ?? 0;
                  const selected = qty > 0;
                  return (
                    <li key={a.id} className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors",
                      selected ? "border-primary bg-primary/8" : "border-border"
                    )}>
                      <button
                        type="button"
                        onClick={() => toggleAddon(a.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="text-sm font-semibold text-foreground">{a.name}</p>
                        {a.description && <p className="text-[11px] text-muted-foreground">{a.description}</p>}
                      </button>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatMoney(a.price_cents)}</p>
                        <p className="text-[10px] text-muted-foreground">{a.billing === "per_day" ? "/ day" : "/ rental"}</p>
                      </div>
                      {selected ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAddonQty(a.id, qty - 1)}
                            className="grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted"
                            aria-label="Decrease quantity"
                          >−</button>
                          <span className="w-6 text-center text-sm font-bold tabular-nums">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setAddonQty(a.id, qty + 1)}
                            disabled={qty >= 10}
                            className="grid h-7 w-7 place-items-center rounded-full border border-border text-foreground hover:bg-muted disabled:opacity-30"
                            aria-label="Increase quantity"
                          >+</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleAddon(a.id)}
                          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        >
                          Add
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        {step === "details" && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Your details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name *" className="sm:col-span-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
              </Field>
              <Field label="Phone *">
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 5555" />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </Field>
              <Field label="Driver license #">
                <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              </Field>
              <Field label="License expiry">
                <Input type="date" value={licenseExpiry} onChange={(e) => setLicenseExpiry(e.target.value)} />
              </Field>
              <Field label="Notes for the rental team" className="sm:col-span-2">
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know — e.g. flight number, special requests…" />
              </Field>
              <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                Bring your driver's license at pickup. The rental team will verify it before handing over the keys.
              </p>
            </CardContent>
          </Card>
        )}

        {step === "review" && selectedVehicle && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Review your booking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Row label="Vehicle" value={`${selectedVehicle.year ?? ""} ${selectedVehicle.make} ${selectedVehicle.model}`.trim()} />
              <Row label="Pickup" value={`${pickupAt.toLocaleString()}${pickupLocationId ? ` · ${locations.find((l) => l.id === pickupLocationId)?.name ?? ""}` : ""}`} />
              <Row label="Drop-off" value={`${dropoffAt.toLocaleString()}${dropoffLocationId ? ` · ${locations.find((l) => l.id === dropoffLocationId)?.name ?? ""}` : ""}`} />
              <Row label="Renter" value={`${name} · ${phone}${email ? ` · ${email}` : ""}`} />

              <div className="border-t border-border pt-3 space-y-2">
                <Label className="text-xs font-semibold text-foreground/80">Promo code</Label>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-600" />
                      <span className="font-mono font-bold text-foreground">{appliedPromo.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {appliedPromo.kind === "percent" ? `${appliedPromo.amount}% off` : `${formatMoney(appliedPromo.amount)} off`}
                      </span>
                    </div>
                    <button type="button" onClick={removePromo} className="text-xs text-muted-foreground underline hover:text-foreground">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={promoCodeInput}
                        onChange={(e) => { setPromoCodeInput(e.target.value.toUpperCase()); setPromoError(null); }}
                        placeholder="Enter code"
                        className="font-mono uppercase"
                      />
                      <Button type="button" variant="outline" onClick={applyPromoCode} disabled={!promoCodeInput.trim() || promoChecking}>
                        {promoChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {promoError && <p className="text-[11px] text-destructive">{promoError}</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3">
                <Row label={pricing?.explain ?? `${rentalDays} day${rentalDays === 1 ? "" : "s"} × ${formatMoney(selectedVehicle.daily_rate_cents)}`} value={formatMoney(baseTotal)} />
                {pricing && pricing.savings_cents > 0 && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 -mt-0.5">
                    You save {formatMoney(pricing.savings_cents)} vs daily rate
                  </p>
                )}
                {addonsTotal > 0 && <Row label="Add-ons" value={formatMoney(addonsTotal)} />}
                {discountCents > 0 && <Row label={`Discount (${appliedPromo?.code})`} value={`-${formatMoney(discountCents)}`} />}
                {taxesCents > 0 && <Row label={`${taxLabel} (${(taxRateBps / 100).toFixed(2)}%)`} value={formatMoney(taxesCents)} />}
                {securityDeposit > 0 && <Row label="Security deposit (refundable)" value={formatMoney(securityDeposit)} />}
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-base font-bold">Total due</span>
                <span className="text-2xl font-bold text-foreground">{formatMoney(total)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your request will be sent to the rental team for confirmation. You'll receive your confirmation code on the next screen.
              </p>

              {cancellationPolicy && (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cancellation policy</p>
                  <p className="text-xs text-foreground/85 whitespace-pre-wrap">{cancellationPolicy}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === "payment" && paymentSession && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="text-base">
                {paymentSession.captureMode === "manual" ? "Secure your booking" : "Pay for your booking"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">
                    {paymentSession.captureMode === "manual" ? "Refundable deposit hold" : "Total today"}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(paymentSession.amountCents)}
                  </span>
                </div>
                {paymentSession.captureMode === "manual" && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Rental balance of {formatMoney(Math.max(0, total - paymentSession.amountCents))} is collected at pickup.
                  </p>
                )}
              </div>

              <CarRentalInlinePaymentForm
                clientSecret={paymentSession.clientSecret}
                amountCents={paymentSession.amountCents}
                currency={paymentSession.currency}
                captureMode={paymentSession.captureMode}
                onCancel={handlePaymentCancel}
                onSuccess={handlePaymentSuccess}
              />
            </CardContent>
          </Card>
        )}

        {step === "confirmed" && (
          <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-8 text-center space-y-3">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Booking received!</h2>
              <p className="text-sm text-muted-foreground">
                Your confirmation code is
              </p>
              <p className="font-mono text-2xl font-bold tracking-wider text-foreground">{submittedCode}</p>
              {submittedCode && (
                <div className="mx-auto inline-block rounded-lg bg-white p-3 ring-1 ring-border">
                  <QRCodeSVG
                    value={`${window.location.origin}/car-rental-booking/${submittedCode}`}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                The {store.name} team will reach out to confirm. Scan or save this code to look up your booking.
              </p>
              {submittedCode && (
                <Link to={`/car-rental-booking/${submittedCode}`} className="inline-block text-sm font-semibold text-primary underline">
                  Open my booking
                </Link>
              )}
              <Link to="/" className="inline-block pt-2 text-sm text-primary underline">Back to home</Link>
            </CardContent>
          </Card>
        )}

        {step !== "confirmed" && step !== "payment" && (
          <div className="mt-5 flex items-center justify-between">
            {step !== "dates" ? (
              <Button variant="outline" onClick={goBack} disabled={submitting}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            ) : <div />}
            {step !== "review" ? (
              <Button onClick={goNext}>
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Continue to payment
              </Button>
            )}
          </div>
        )}
      </main>}
    </div>
  );
}

function Storefront({ store, vehicles, locations, reviews, bookedNow, popularIds, onStartBooking }: {
  store: StoreInfo;
  vehicles: Vehicle[];
  locations: Location[];
  reviews: { rating: number; comment: string | null; customer_name: string; created_at: string }[];
  bookedNow: Set<string>;
  popularIds: Set<string>;
  onStartBooking: () => void;
}) {
  const cheapest = vehicles.reduce<Vehicle | null>((min, v) => !min || v.daily_rate_cents < min.daily_rate_cents ? v : min, null);
  const cats = Array.from(new Set(vehicles.map((v) => v.category))).slice(0, 4);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const { format: formatMoney } = useStoreCurrency(store.id);
  const [catFilter, setCatFilter] = useState<string>("all");
  const [transmissionFilter, setTransmissionFilter] = useState<"all" | "automatic" | "manual">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  // Favorites — persisted per store slug in localStorage. Renters can curate a personal shortlist.
  const favoritesKey = `zivo:car-rental:fav:${store.slug}`;
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(favoritesKey);
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch { /* localStorage unavailable */ }
  }, [favoritesKey]);
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(favoritesKey, JSON.stringify(Array.from(next))); } catch { /* */ }
      return next;
    });
  };

  const allCategories = Array.from(new Set(vehicles.map((v) => v.category)));
  const q = searchQuery.trim().toLowerCase();
  const filteredVehicles = vehicles.filter((v) =>
    (catFilter === "all" || v.category === catFilter)
    && (transmissionFilter === "all" || v.transmission === transmissionFilter)
    && (!favoritesOnly || favorites.has(v.id))
    && (q === "" ||
        v.make.toLowerCase().includes(q)
        || v.model.toLowerCase().includes(q)
        || v.category.toLowerCase().includes(q)
        || (v.color ?? "").toLowerCase().includes(q)
        || (Array.isArray(v.features) && v.features.some((f) => typeof f === "string" && f.toLowerCase().includes(q))))
  );

  return (
    <main>
      {/* Hero */}
      <section className={cn(
        "relative px-4 py-10 sm:py-16 text-center border-b border-border",
        store.cover_image_url ? "" : "bg-gradient-to-br from-primary/8 via-background to-background"
      )}
      style={store.cover_image_url ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.45)), url(${store.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      >
        <div className={cn("mx-auto max-w-3xl", store.cover_image_url && "text-white")}>
          <h1 className={cn("text-3xl sm:text-5xl font-bold leading-tight", store.cover_image_url ? "text-white" : "text-foreground")}>
            {store.name}
          </h1>
          {store.description && (
            <p className={cn("mt-3 text-base sm:text-lg max-w-2xl mx-auto", store.cover_image_url ? "text-white/90" : "text-muted-foreground")}>
              {store.description}
            </p>
          )}
          {avgRating !== null && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className={store.cover_image_url ? "text-white" : "text-foreground"}>
                {avgRating.toFixed(1)} from {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </div>
          )}
          <div className="mt-6">
            <Button size="lg" onClick={onStartBooking} className="px-8 py-6 text-base font-bold">
              <CalendarRange className="mr-2 h-5 w-5" /> Book now
              {cheapest && <span className="ml-2 opacity-80 text-sm font-normal">from {formatMoney(cheapest.daily_rate_cents)}/day</span>}
            </Button>
          </div>
          {/* Trust signals — surface what's true about this store, not generic copy. */}
          <div className={cn(
            "mt-5 flex flex-wrap justify-center gap-3 text-[12px]",
            store.cover_image_url ? "text-white/90" : "text-muted-foreground"
          )}>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Instant online booking
            </span>
            {vehicles.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5" /> {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} ready
              </span>
            )}
            {locations.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {locations.length === 1 ? "1 pickup location" : `${locations.length} pickup locations`}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified store
            </span>
          </div>
        </div>
      </section>

      {/* Fleet preview */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Our fleet ({filteredVehicles.length}{filteredVehicles.length !== vehicles.length ? ` of ${vehicles.length}` : ""})</h2>
          {cats.length > 0 && (
            <p className="text-sm text-muted-foreground capitalize">{cats.join(" · ")}</p>
          )}
        </div>
        {(() => {
          const availableCount = vehicles.filter((v) => !bookedNow.has(v.id)).length;
          if (vehicles.length === 0 || availableCount === vehicles.length) return null;
          return (
            <p className="-mt-2 mb-4 text-[12px] text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {availableCount} of {vehicles.length} vehicles available right now
            </p>
          );
        })()}
        {vehicles.length > 3 && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  placeholder="Search by make, model, color, or feature…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {favorites.size > 0 && (
                <button
                  type="button"
                  onClick={() => setFavoritesOnly((v) => !v)}
                  className={cn(
                    "h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border text-[11px] font-semibold uppercase tracking-wider transition-colors",
                    favoritesOnly
                      ? "border-rose-500 bg-rose-500 text-white"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Heart className={cn("h-3.5 w-3.5", favoritesOnly ? "fill-white" : "fill-rose-500/20 text-rose-500")} />
                  Favorites ({favorites.size})
                </button>
              )}
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setCatFilter("all")} className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
                catFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground",
              )}>All</button>
              {allCategories.map((c) => (
                <button key={c} type="button" onClick={() => setCatFilter(c)} className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors capitalize",
                  catFilter === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}>{c}</button>
              ))}
              <span className="mx-1 text-muted-foreground/30">·</span>
              {(["all", "automatic", "manual"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTransmissionFilter(t)} className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors capitalize",
                  transmissionFilter === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}>{t === "all" ? "Any transmission" : t}</button>
              ))}
            </div>
          </>
        )}
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Car className="mx-auto mb-2 h-10 w-10 opacity-50" />
            We're still adding vehicles. Check back soon.
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Car className="mx-auto mb-2 h-10 w-10 opacity-50" />
            No vehicles match those filters. <button type="button" className="text-primary underline ml-1" onClick={() => { setCatFilter("all"); setTransmissionFilter("all"); }}>Clear filters</button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVehicles.slice(0, 9).map((v) => (
              <li key={v.id} className="relative">
                <button type="button" onClick={onStartBooking} className="group w-full text-left rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                  <div className="relative">
                    {v.photo_url ? (
                      <img src={v.photo_url} alt="" className="h-36 w-full object-cover" />
                    ) : (
                      <div className="grid h-36 w-full place-items-center bg-muted">
                        <Car className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1">
                      {!bookedNow.has(v.id) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                          Available now
                        </span>
                      )}
                      {popularIds.has(v.id) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow">
                          <Star className="h-2.5 w-2.5 fill-white" /> Popular
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-foreground">
                      {v.year ? `${v.year} ` : ""}{v.make} {v.model}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">{v.category}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{v.seats}</span>
                      <span className="inline-flex items-center gap-1"><Cog className="h-3 w-3" />{v.transmission}</span>
                      <span className="inline-flex items-center gap-1"><Fuel className="h-3 w-3" />{v.fuel_type}</span>
                    </div>
                    {Array.isArray(v.features) && v.features.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {v.features.slice(0, 4).map((f, i) => (
                          <span key={`${f}-${i}`} className="rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {f}
                          </span>
                        ))}
                        {v.features.length > 4 && (
                          <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            +{v.features.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-2 text-lg font-bold text-foreground">
                      {formatMoney(v.daily_rate_cents)}<span className="text-xs font-medium text-muted-foreground">/day</span>
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(v.id); }}
                  aria-label={favorites.has(v.id) ? "Remove from favorites" : "Save to favorites"}
                  className={cn(
                    "absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full shadow transition-colors",
                    favorites.has(v.id) ? "bg-rose-500 text-white" : "bg-card/90 backdrop-blur text-muted-foreground hover:text-rose-500"
                  )}
                >
                  <Heart className={cn("h-4 w-4", favorites.has(v.id) && "fill-white")} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Locations */}
      {locations.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-6 border-t border-border">
          <h2 className="mb-3 text-xl font-bold text-foreground">Pickup locations</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {locations.map((l) => (
              <li key={l.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-semibold text-foreground">{l.name}</p>
                {(l.address || l.city) && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[l.address, l.city].filter(Boolean).join(", ")}
                  </p>
                )}
                {(l.open_time && l.close_time) && (
                  <p className="text-[11px] text-muted-foreground">
                    Open {l.open_time.slice(0, 5)} – {l.close_time.slice(0, 5)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-10 border-t border-border">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground">What renters are saying</h2>
            {avgRating !== null && (
              <p className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)} / 5
              </p>
            )}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <li key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn("h-3.5 w-3.5", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                  ))}
                </div>
                {r.comment && <p className="mt-2 text-sm text-foreground/90 line-clamp-4">{r.comment}</p>}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {r.customer_name} · {new Date(r.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-10 border-t border-border">
        <h2 className="mb-4 text-xl font-bold text-foreground">Frequently asked questions</h2>
        <FAQAccordion items={[
          { q: "What do I need to bring at pickup?", a: "A valid driver's license, the credit card used to book, and your confirmation code (we send it after you book). International renters should bring their passport too." },
          { q: "Is fuel included?", a: "Vehicles come with a full tank. Return with the same fuel level to avoid a refuel charge — or pre-pay a fuel package at booking." },
          { q: "Can someone else drive the rental?", a: "Yes — add additional drivers at booking. Each must be present at pickup with their license." },
          { q: "Can I extend my rental once it's started?", a: "Yes. Call us at least 24 hours before the original drop-off and we'll adjust the booking, subject to vehicle availability." },
          { q: "What's your cancellation policy?", a: "Cancellation terms appear during checkout. Cancel from your booking page or contact us — refunds follow the tier shown there." },
          { q: "Is insurance included?", a: "Basic liability is included. Comprehensive zero-deductible insurance is available as an add-on at booking." },
          { q: "What if I'm late returning the car?", a: "There's a 12-hour grace period. After that we charge the daily rate per additional started day." },
          { q: "Can I cross borders or take the car off-road?", a: "Cross-border travel and off-road use require prior approval. Ask us before booking." },
        ]} />
      </section>

      {/* Contact card */}
      <section className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-lg font-bold text-foreground">Need help? Get in touch</h2>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {locations.length > 0 && locations.map((l) => (
              <div key={l.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-semibold text-foreground">{l.name}</p>
                {(l.address || l.city) && (
                  <p className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {[l.address, l.city].filter(Boolean).join(", ")}
                  </p>
                )}
                {l.open_time && l.close_time && (
                  <p className="text-[11px] text-muted-foreground">
                    Open {l.open_time.slice(0, 5)} – {l.close_time.slice(0, 5)}
                  </p>
                )}
              </div>
            ))}
            {locations.length === 0 && (
              <p className="text-sm text-muted-foreground">Contact information will appear here once a location is configured.</p>
            )}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border bg-muted/30 px-4 py-10 text-center">
        <h2 className="text-2xl font-bold text-foreground">Ready to hit the road?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pick your dates and we'll show you what's available.</p>
        <div className="mt-4">
          <Button size="lg" onClick={onStartBooking} className="px-8 py-6 text-base font-bold">
            <CalendarRange className="mr-2 h-5 w-5" /> Start booking
          </Button>
        </div>
      </section>
    </main>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold text-foreground">{value}</span>
    </div>
  );
}

function FAQAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/30"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-foreground">{item.q}</span>
              <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
            </button>
            {isOpen && (
              <div className="border-t border-border bg-muted/20 p-4">
                <p className="text-sm text-foreground/85 leading-relaxed">{item.a}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
