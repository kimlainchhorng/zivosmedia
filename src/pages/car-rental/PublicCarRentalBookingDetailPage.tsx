/**
 * PublicCarRentalBookingDetailPage — customer-facing reservation lookup.
 *
 * Route: /car-rental-booking/:code  (typed straight into the URL or sent via SMS/email)
 * If `code` is missing or unknown, the page falls back to a lookup form.
 */
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, Loader2, AlertTriangle, CheckCircle2, Calendar, MapPin, User, Phone, Mail, Search, XCircle, CalendarClock, Download, ExternalLink,
} from "lucide-react";
import { useStoreCurrency } from "@/lib/car-rental/money";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildIcsFile, downloadIcs } from "@/lib/car-rental/ical";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ReservationRow {
  id: string;
  store_id: string;
  vehicle_id: string | null;
  vehicle_label: string;
  vehicle_category: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;
  pickup_at: string;
  dropoff_at: string;
  rental_days: number;
  daily_rate_cents: number;
  base_total_cents: number;
  addons_total_cents: number;
  insurance_total_cents: number;
  taxes_cents: number;
  fees_cents: number;
  discount_cents: number;
  security_deposit_cents: number;
  total_cents: number;
  deposit_paid_cents: number;
  amount_paid_cents: number;
  status: string;
  confirmation_code: string;
  customer_notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

interface ReservationAddon {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  billing: string;
  total_cents: number;
}

interface StoreRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
}


export default function PublicCarRentalBookingDetailPage() {
  const { code: codeFromUrl } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState<string>(codeFromUrl ?? "");
  const [reservation, setReservation] = useState<ReservationRow | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [addons, setAddons] = useState<ReservationAddon[]>([]);
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(codeFromUrl));
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [pickupAtLocal, setPickupAtLocal] = useState("");
  const [dropoffAtLocal, setDropoffAtLocal] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const { format: formatMoney } = useStoreCurrency(reservation?.store_id);

  useEffect(() => {
    if (codeFromUrl) {
      void lookup(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromUrl]);

  const lookup = async (c: string) => {
    setLoading(true);
    setError(null);
    setReservation(null);
    setStore(null);
    setAddons([]);
    setVehicleFeatures([]);
    const normalized = c.trim().toUpperCase();
    const { data, error: err } = await supabase
      .from("car_rental_reservations")
      .select("*")
      .eq("confirmation_code", normalized)
      .maybeSingle();
    if (err || !data) {
      setError("No reservation found with that confirmation code.");
      setLoading(false);
      return;
    }
    const r = data as unknown as ReservationRow;
    setReservation(r);
    // Fan-out the secondary fetches in parallel — store, add-ons, and (if linked) vehicle features.
    const [storeR, addonsR, vehR] = await Promise.all([
      supabase
        .from("store_profiles")
        .select("id, name, slug, logo_url, city, state")
        .eq("id", r.store_id)
        .maybeSingle(),
      supabase
        .from("car_rental_reservation_addons")
        .select("id, name, quantity, unit_price_cents, billing, total_cents")
        .eq("reservation_id", r.id)
        .order("name", { ascending: true }),
      r.vehicle_id
        ? supabase.from("car_rental_vehicles").select("features").eq("id", r.vehicle_id).maybeSingle()
        : Promise.resolve({ data: null } as { data: { features: unknown } | null }),
    ]);
    if (storeR.data) setStore(storeR.data as unknown as StoreRow);
    setAddons((addonsR.data ?? []) as unknown as ReservationAddon[]);
    const fts = (vehR.data as { features?: unknown } | null)?.features;
    if (Array.isArray(fts)) setVehicleFeatures(fts.filter((f): f is string => typeof f === "string"));
    setLoading(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    navigate(`/car-rental-booking/${code.trim().toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Lookup screen
  if (!reservation) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet><title>Find your booking</title></Helmet>
        <header className="border-b border-border bg-card">
          <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Find your booking</h1>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-md px-4 py-10">
          <Card className="rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-5 w-5 text-primary" /> Enter confirmation code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-3">
                <Input
                  autoFocus
                  className="font-mono uppercase tracking-wider"
                  placeholder="e.g. AB12CD34"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                {error && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4" /> {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={!code.trim()}>
                  <Search className="mr-1 h-4 w-4" /> Look up booking
                </Button>
              </form>
              <Link to="/" className="mt-4 block text-center text-sm text-primary underline">Back to home</Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Detail screen
  const r = reservation;
  const subtotal = r.base_total_cents + r.addons_total_cents + r.insurance_total_cents;

  // Customer self-reschedule is allowed only for pending/confirmed AND > 24h before pickup.
  const pickupMs = new Date(r.pickup_at).getTime();
  const hoursToPickup = (pickupMs - Date.now()) / (60 * 60 * 1000);
  const canReschedule = (r.status === "pending" || r.status === "confirmed") && hoursToPickup > 24;

  // Open the reschedule dialog with the current dates pre-filled.
  const openReschedule = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    setPickupAtLocal(toLocal(r.pickup_at));
    setDropoffAtLocal(toLocal(r.dropoff_at));
    setRescheduleOpen(true);
  };

  const submitReschedule = async () => {
    const newPickup = new Date(pickupAtLocal);
    const newDropoff = new Date(dropoffAtLocal);
    if (!(newPickup.getTime() > 0) || !(newDropoff.getTime() > 0)) {
      toast.error("Please choose valid dates.");
      return;
    }
    if (newDropoff.getTime() <= newPickup.getTime()) {
      toast.error("Drop-off must be after pickup.");
      return;
    }
    if ((newPickup.getTime() - Date.now()) < 24 * 60 * 60 * 1000) {
      toast.error("Pickup must be at least 24 hours from now.");
      return;
    }
    setRescheduling(true);
    const rentalDays = Math.max(1, Math.ceil((newDropoff.getTime() - newPickup.getTime()) / (24 * 60 * 60 * 1000)));
    const newBase = r.daily_rate_cents * rentalDays;
    const newTotal = newBase + r.addons_total_cents + r.insurance_total_cents + r.taxes_cents + r.fees_cents - r.discount_cents;
    const { error: err } = await supabase
      .from("car_rental_reservations")
      .update({
        pickup_at: newPickup.toISOString(),
        dropoff_at: newDropoff.toISOString(),
        rental_days: rentalDays,
        base_total_cents: newBase,
        total_cents: newTotal,
      } as never)
      .eq("id", r.id);
    setRescheduling(false);
    if (err) {
      toast.error("Couldn't reschedule — please contact the rental team directly.");
      return;
    }
    toast.success("Dates updated");
    setRescheduleOpen(false);
    void lookup(r.confirmation_code);
  };

  // Build a Google Maps "search" URL from the pickup location name + store city/state.
  const directionsUrl = (() => {
    const parts = [r.pickup_location_name, store?.city, store?.state].filter(Boolean);
    if (parts.length === 0) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(", "))}`;
  })();

  // Download a single-event .ics for the booking.
  const downloadCalendarFile = () => {
    const ics = buildIcsFile({
      calendarName: `${store?.name ?? "Car rental"} — ${r.confirmation_code}`,
      reservations: [{
        id: r.id,
        confirmation_code: r.confirmation_code,
        vehicle_label: r.vehicle_label,
        customer_name: r.customer_name,
        customer_phone: r.customer_phone,
        customer_email: r.customer_email,
        pickup_location_name: r.pickup_location_name,
        pickup_at: r.pickup_at,
        dropoff_at: r.dropoff_at,
        status: r.status,
        total_cents: r.total_cents,
        rental_days: r.rental_days,
        customer_notes: r.customer_notes,
      }],
    });
    downloadIcs(`${r.confirmation_code}.ics`, ics);
    toast.success("Calendar event downloaded", { description: "Open the .ics file to add to your calendar app." });
  };

  const statusTone =
    r.status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : r.status === "confirmed" ? "bg-primary/10 text-primary border-primary/30"
    : r.status === "picked_up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : r.status === "returned" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 opacity-75"
    : "bg-muted text-muted-foreground border-border";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Booking {r.confirmation_code}{store ? ` · ${store.name}` : ""}</title>
      </Helmet>
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          {store?.logo_url ? (
            <img src={store.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Car className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-base font-bold text-foreground">{store?.name ?? "Your booking"}</h1>
            {store && (
              <p className="text-[11px] text-muted-foreground">
                {[store.city, store.state].filter(Boolean).join(", ") || "Car Rental"}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4">
        <Card className="rounded-2xl border-border/60">
          <CardContent className="p-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Confirmation code</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-foreground">{r.confirmation_code}</p>
            <span className={cn("mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider", statusTone)}>
              {r.status === "no_show" ? "no-show" : r.status === "picked_up" ? "on rental" : r.status}
            </span>
          </CardContent>
        </Card>

        {(canReschedule || r.status === "pending" || r.status === "confirmed" || r.status === "picked_up") && (
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={downloadCalendarFile}>
              <Download className="mr-1 h-3.5 w-3.5" /> Add to calendar
            </Button>
            {canReschedule && (
              <Button variant="outline" size="sm" onClick={openReschedule}>
                <CalendarClock className="mr-1 h-3.5 w-3.5" /> Reschedule
              </Button>
            )}
          </div>
        )}

        <Card className="rounded-2xl border-border/60">
          <CardHeader><CardTitle className="text-base">Your rental</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <Car className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{r.vehicle_label}</p>
                {r.vehicle_category && <p className="text-[11px] text-muted-foreground capitalize">{r.vehicle_category}</p>}
                {vehicleFeatures.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {vehicleFeatures.slice(0, 6).map((f, i) => (
                      <span key={`${f}-${i}`} className="rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {f}
                      </span>
                    ))}
                    {vehicleFeatures.length > 6 && (
                      <span className="rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        +{vehicleFeatures.length - 6}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">
                  {new Date(r.pickup_at).toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Until {new Date(r.dropoff_at).toLocaleString()} ({r.rental_days} day{r.rental_days === 1 ? "" : "s"})
                </p>
              </div>
            </div>
            {(r.pickup_location_name || r.dropoff_location_name) && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{r.pickup_location_name ?? "—"}</p>
                    {directionsUrl && (
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                      >
                        Directions <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  {r.dropoff_location_name && r.dropoff_location_name !== r.pickup_location_name && (
                    <p className="text-[11px] text-muted-foreground">Return to {r.dropoff_location_name}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader><CardTitle className="text-base">Renter</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> {r.customer_name}</p>
            {r.customer_phone && <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /> {r.customer_phone}</p>}
            {r.customer_email && <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /> {r.customer_email}</p>}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader><CardTitle className="text-base">Charges</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row label={`${r.rental_days} day${r.rental_days === 1 ? "" : "s"} × ${formatMoney(r.daily_rate_cents)}`} value={formatMoney(r.base_total_cents)} />
            {addons.length > 0 ? (
              addons.map((a) => (
                <Row
                  key={a.id}
                  label={`${a.name}${a.quantity > 1 ? ` × ${a.quantity}` : ""}${a.billing && a.billing !== "flat" ? ` (${a.billing.replace(/_/g, " ")})` : ""}`}
                  value={formatMoney(a.total_cents)}
                />
              ))
            ) : (
              r.addons_total_cents > 0 && <Row label="Add-ons" value={formatMoney(r.addons_total_cents)} />
            )}
            {r.insurance_total_cents > 0 && <Row label="Insurance" value={formatMoney(r.insurance_total_cents)} />}
            {r.taxes_cents > 0 && <Row label="Taxes" value={formatMoney(r.taxes_cents)} />}
            {r.fees_cents > 0 && <Row label="Fees" value={formatMoney(r.fees_cents)} />}
            {r.discount_cents > 0 && <Row label="Discount" value={`-${formatMoney(r.discount_cents)}`} />}
            {r.security_deposit_cents > 0 && <Row label="Security deposit (refundable)" value={formatMoney(r.security_deposit_cents)} />}
            <div className="!mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatMoney(r.total_cents)}</span>
            </div>
            {r.amount_paid_cents > 0 && (
              <Row label="Paid" value={formatMoney(r.amount_paid_cents)} />
            )}
            {r.deposit_paid_cents > 0 && (
              <Row label="Deposit on file" value={formatMoney(r.deposit_paid_cents)} />
            )}
          </CardContent>
        </Card>

        {r.customer_notes && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader><CardTitle className="text-base">Your notes</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.customer_notes}</p>
            </CardContent>
          </Card>
        )}

        {r.cancelled_at && (
          <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-destructive">Cancelled</p>
              <p className="mt-0.5 text-xs text-destructive/80">
                On {new Date(r.cancelled_at).toLocaleDateString()}
                {r.cancellation_reason ? ` — ${r.cancellation_reason}` : ""}
              </p>
            </CardContent>
          </Card>
        )}

        {(r.status === "pending" || r.status === "confirmed" || r.status === "picked_up") && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader><CardTitle className="text-base">What to bring</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">Driver's license</span>
                    <span className="text-muted-foreground"> — original, not expired. Required at pickup.</span>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">Payment card</span>
                    <span className="text-muted-foreground"> — the credit/debit card used for the booking.</span>
                  </span>
                </li>
                {r.security_deposit_cents > 0 && (
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <span>
                      <span className="font-semibold text-foreground">Security deposit ({formatMoney(r.security_deposit_cents)})</span>
                      <span className="text-muted-foreground"> — held on your card; refunded after a clean return.</span>
                    </span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">Confirmation code</span>
                    <span className="text-muted-foreground"> — <span className="font-mono">{r.confirmation_code}</span>. Have it ready at pickup.</span>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>
                    <span className="font-semibold text-foreground">Arrive within operating hours</span>
                    <span className="text-muted-foreground"> — confirm with {store?.name ?? "the rental team"} if you need an after-hours pickup.</span>
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {(r.status === "pending" || r.status === "confirmed") && (
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-sm font-semibold text-foreground">See you at pickup</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The {store?.name ?? "rental"} team will reach out if anything changes.
              </p>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => setCancelOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel this booking
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Link to="/" className="block text-center text-sm text-primary underline">Back to home</Link>
      </main>

      <Dialog open={cancelOpen} onOpenChange={(o) => !cancelling && setCancelOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Cancel your booking?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-semibold text-foreground">{r.vehicle_label}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(r.pickup_at).toLocaleDateString()} → {new Date(r.dropoff_at).toLocaleDateString()}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              The {store?.name ?? "rental"} team will be notified. Refund (if any) follows their cancellation policy.
            </p>
            <Textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (optional) — e.g. travel plans changed"
              maxLength={250}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Keep booking
            </Button>
            <Button variant="destructive" disabled={cancelling} onClick={async () => {
              setCancelling(true);
              const reasonLabel = "Customer self-cancelled";
              const reason = cancelReason.trim() ? `${reasonLabel} — ${cancelReason.trim()}` : reasonLabel;
              const { error: err } = await supabase
                .from("car_rental_reservations")
                .update({
                  status: "cancelled",
                  cancellation_reason: reason,
                  cancelled_at: new Date().toISOString(),
                } as never)
                .eq("id", r.id);
              setCancelling(false);
              if (err) {
                toast.error("Couldn't cancel — please contact the rental team directly.");
                return;
              }
              toast.success("Booking cancelled");
              setCancelOpen(false);
              // Refresh
              void lookup(r.confirmation_code);
            }}>
              {cancelling ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <XCircle className="mr-1 h-4 w-4" />}
              Cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={(o) => !rescheduling && setRescheduleOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Reschedule your booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="font-semibold text-foreground">{r.vehicle_label}</p>
              <p className="text-xs text-muted-foreground">
                Currently: {new Date(r.pickup_at).toLocaleString()} → {new Date(r.dropoff_at).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New pickup</Label>
                <Input type="datetime-local" value={pickupAtLocal} onChange={(e) => setPickupAtLocal(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">New drop-off</Label>
                <Input type="datetime-local" value={dropoffAtLocal} onChange={(e) => setDropoffAtLocal(e.target.value)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Pickup must be at least 24 hours from now. The daily rate stays the same; the total
              will be recalculated based on the new rental length. For shorter notice or other
              changes, please contact {store?.name ?? "the rental team"} directly.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)} disabled={rescheduling}>
              Keep current dates
            </Button>
            <Button onClick={submitReschedule} disabled={rescheduling}>
              {rescheduling ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Save new dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
