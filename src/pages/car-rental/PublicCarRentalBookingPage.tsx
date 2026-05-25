/**
 * PublicCarRentalBookingPage — customer-facing booking flow for a single
 * car-rental store. Mirrors the salon public booking flow.
 *
 * Route: /car-rental/:slug
 * Flow: pick location + dates → choose vehicle → choose add-ons → enter
 *       contact info → submit (creates a 'pending' / 'app'-sourced reservation).
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Helmet } from "react-helmet-async";
import {
  Car, CalendarRange, MapPin, Loader2, CheckCircle2, ChevronLeft, ChevronRight,
  Users, Fuel, Cog, Briefcase, Snowflake, AlertTriangle, Tag, Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

type Step = "dates" | "vehicle" | "addons" | "details" | "review" | "confirmed";
type Mode = "storefront" | "wizard";

export default function PublicCarRentalBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [publicReviews, setPublicReviews] = useState<{ rating: number; comment: string | null; customer_name: string; created_at: string }[]>([]);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
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

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ id: string; code: string; kind: "percent" | "flat"; amount: number; description: string | null } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

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

      const [locsR, vehsR, addonsR, reviewsR] = await Promise.all([
        supabase.from("car_rental_locations").select("*").eq("store_id", (storeRow as any).id).eq("is_active", true).order("is_default", { ascending: false }),
        supabase.from("car_rental_vehicles").select("*").eq("store_id", (storeRow as any).id).eq("is_active", true).neq("status", "retired"),
        supabase.from("car_rental_addons").select("*").eq("store_id", (storeRow as any).id).eq("is_active", true).order("sort_order"),
        supabase.from("car_rental_reviews").select("rating, comment, customer_name, created_at").eq("store_id", (storeRow as any).id).eq("is_published", true).order("created_at", { ascending: false }).limit(6),
      ]);
      if (cancelled) return;
      const locs = (locsR.data ?? []) as unknown as Location[];
      setLocations(locs);
      setVehicles((vehsR.data ?? []) as unknown as Vehicle[]);
      setAddons((addonsR.data ?? []) as unknown as Addon[]);
      setPublicReviews((reviewsR.data ?? []) as unknown as typeof publicReviews);
      const def = locs.find((l) => l.is_default) ?? locs[0];
      if (def) {
        setPickupLocationId(def.id);
        setDropoffLocationId(def.id);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

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

  const baseTotal = selectedVehicle ? selectedVehicle.daily_rate_cents * rentalDays : 0;
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

  const total = baseTotal + addonsTotal + securityDeposit - discountCents;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, 1);
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

    setSubmittedCode((data as any).confirmation_code);
    setStep("confirmed");
    setSubmitting(false);
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
                        <div className="mt-2 flex items-baseline justify-between">
                          <p className="text-xl font-bold text-foreground">{formatMoney(v.daily_rate_cents)}<span className="text-xs font-medium text-muted-foreground">/day</span></p>
                          {rentalDays > 0 && !isUnavailable && (
                            <p className="text-[11px] text-muted-foreground">
                              Total: <span className="font-bold text-foreground">{formatMoney(v.daily_rate_cents * rentalDays)}</span>
                            </p>
                          )}
                        </div>
                      </button>
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
                  const selected = selectedAddons.has(a.id);
                  return (
                    <li key={a.id}>
                      <button type="button" onClick={() => toggleAddon(a.id)} className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                        selected ? "border-primary bg-primary/8" : "border-border hover:border-primary/30"
                      )}>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{a.name}</p>
                          {a.description && <p className="text-[11px] text-muted-foreground">{a.description}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{formatMoney(a.price_cents)}</p>
                          <p className="text-[10px] text-muted-foreground">{a.billing === "per_day" ? "/ day" : "/ rental"}</p>
                        </div>
                        <div className={cn(
                          "ml-1 h-5 w-5 rounded-full border-2",
                          selected ? "border-primary bg-primary grid place-items-center" : "border-muted-foreground/40"
                        )}>
                          {selected && <CheckCircle2 className="h-4 w-4 text-primary-foreground" />}
                        </div>
                      </button>
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
                <Row label={`${rentalDays} day${rentalDays === 1 ? "" : "s"} × ${formatMoney(selectedVehicle.daily_rate_cents)}`} value={formatMoney(baseTotal)} />
                {addonsTotal > 0 && <Row label="Add-ons" value={formatMoney(addonsTotal)} />}
                {discountCents > 0 && <Row label={`Discount (${appliedPromo?.code})`} value={`-${formatMoney(discountCents)}`} />}
                {securityDeposit > 0 && <Row label="Security deposit (refundable)" value={formatMoney(securityDeposit)} />}
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <span className="text-base font-bold">Total due</span>
                <span className="text-2xl font-bold text-foreground">{formatMoney(total)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Your request will be sent to the rental team for confirmation. You'll receive your confirmation code on the next screen.
              </p>
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

        {step !== "confirmed" && (
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
                Confirm booking
              </Button>
            )}
          </div>
        )}
      </main>}
    </div>
  );
}

function Storefront({ store, vehicles, locations, reviews, onStartBooking }: {
  store: StoreInfo;
  vehicles: Vehicle[];
  locations: Location[];
  reviews: { rating: number; comment: string | null; customer_name: string; created_at: string }[];
  onStartBooking: () => void;
}) {
  const cheapest = vehicles.reduce<Vehicle | null>((min, v) => !min || v.daily_rate_cents < min.daily_rate_cents ? v : min, null);
  const cats = Array.from(new Set(vehicles.map((v) => v.category))).slice(0, 4);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

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
        </div>
      </section>

      {/* Fleet preview */}
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Our fleet ({vehicles.length})</h2>
          {cats.length > 0 && (
            <p className="text-sm text-muted-foreground capitalize">{cats.join(" · ")}</p>
          )}
        </div>
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Car className="mx-auto mb-2 h-10 w-10 opacity-50" />
            We're still adding vehicles. Check back soon.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.slice(0, 9).map((v) => (
              <li key={v.id}>
                <button type="button" onClick={onStartBooking} className="group w-full text-left rounded-2xl border border-border bg-card overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
                  {v.photo_url ? (
                    <img src={v.photo_url} alt="" className="h-36 w-full object-cover" />
                  ) : (
                    <div className="grid h-36 w-full place-items-center bg-muted">
                      <Car className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
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
                    <p className="mt-2 text-lg font-bold text-foreground">
                      {formatMoney(v.daily_rate_cents)}<span className="text-xs font-medium text-muted-foreground">/day</span>
                    </p>
                  </div>
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
