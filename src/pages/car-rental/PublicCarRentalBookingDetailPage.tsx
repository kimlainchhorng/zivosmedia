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
  Car, Loader2, AlertTriangle, CheckCircle2, Calendar, MapPin, User, Phone, Mail, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ReservationRow {
  id: string;
  store_id: string;
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

interface StoreRow {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  city: string | null;
  state: string | null;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PublicCarRentalBookingDetailPage() {
  const { code: codeFromUrl } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [code, setCode] = useState<string>(codeFromUrl ?? "");
  const [reservation, setReservation] = useState<ReservationRow | null>(null);
  const [store, setStore] = useState<StoreRow | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(codeFromUrl));
  const [error, setError] = useState<string | null>(null);

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
    const { data: s } = await supabase
      .from("store_profiles")
      .select("id, name, slug, logo_url, city, state")
      .eq("id", r.store_id)
      .maybeSingle();
    if (s) setStore(s as unknown as StoreRow);
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

        <Card className="rounded-2xl border-border/60">
          <CardHeader><CardTitle className="text-base">Your rental</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <Car className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-semibold text-foreground">{r.vehicle_label}</p>
                {r.vehicle_category && <p className="text-[11px] text-muted-foreground capitalize">{r.vehicle_category}</p>}
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
                <div>
                  <p className="font-semibold text-foreground">{r.pickup_location_name ?? "—"}</p>
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
            {r.addons_total_cents > 0 && <Row label="Add-ons" value={formatMoney(r.addons_total_cents)} />}
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

        {(r.status === "pending" || r.status === "confirmed") && (
          <Card className="rounded-2xl border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-primary" />
              <p className="text-sm font-semibold text-foreground">See you at pickup</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Bring your driver's license and the credit card you used to book.
                The {store?.name ?? "rental"} team will reach out if anything changes.
              </p>
            </CardContent>
          </Card>
        )}

        <Link to="/" className="block text-center text-sm text-primary underline">Back to home</Link>
      </main>
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
