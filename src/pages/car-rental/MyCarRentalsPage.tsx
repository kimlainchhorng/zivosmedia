/**
 * Customer self-service portal — show all the user's car-rental reservations
 * across every store, grouped by status.
 *
 * Auth required: the account-owned RPC derives the customer from auth.uid()
 * and returns only reservations belonging to the signed-in user.
 *
 * Route: /my-rentals
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car,
  Calendar,
  MapPin,
  Loader2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatMoneyWith } from "@/lib/car-rental/money";
import { getLoyaltyTier, type LoyaltyTierInfo } from "@/lib/car-rental/loyalty";
import LoyaltyCard from "@/components/car-rental/LoyaltyCard";

interface Reservation {
  id: string;
  store_id: string;
  vehicle_label: string;
  vehicle_category: string | null;
  pickup_at: string;
  dropoff_at: string;
  rental_days: number;
  total_cents: number;
  status: string;
  confirmation_code: string;
  pickup_location_name: string | null;
  payment_status: PaymentStatus | null;
  deposit_paid_cents: number;
  amount_paid_cents: number;
  store_name: string | null;
  store_slug: string | null;
  store_logo_url: string | null;
  currency_code: string | null;
}

type PaymentStatus =
  | "unpaid"
  | "authorized"
  | "processing"
  | "captured"
  | "paid"
  | "refund_pending"
  | "refunded"
  | "failed";

interface StoreMini {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
}

export default function MyCarRentalsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stores, setStores] = useState<Map<string, StoreMini>>(new Map());
  const [currencyMap, setCurrencyMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [loyalty, setLoyalty] = useState<{
    totalRentals: number;
    tier: LoyaltyTierInfo;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // The account-owned RPC derives ownership from auth.uid() and returns
      // only this user's rows. Confirmation codes remain display/support
      // identifiers; they are never used to authorize or locate a booking.
      const { data, error: reservationsError } = await (supabase as any).rpc(
        "car_rental_customer_list_reservations",
      );

      if (cancelled) return;
      if (reservationsError) {
        setError("Couldn't load your rentals.");
        setLoading(false);
        return;
      }
      const payload = (Array.isArray(data) ? data[0] : data) as {
        total_rentals?: unknown;
        reservations?: unknown;
      } | null;
      const rs = Array.isArray(payload?.reservations)
        ? (payload.reservations as Reservation[])
        : [];
      const totalRentals = Number(payload?.total_rentals) || 0;

      setLoyalty({ totalRentals, tier: getLoyaltyTier(totalRentals) });
      setReservations(rs);

      const storeMap = new Map<string, StoreMini>();
      const nextCurrencyMap = new Map<string, string>();
      for (const reservation of rs) {
        if (!storeMap.has(reservation.store_id)) {
          storeMap.set(reservation.store_id, {
            id: reservation.store_id,
            name: reservation.store_name ?? "Rental store",
            slug: reservation.store_slug,
            logo_url: reservation.store_logo_url,
          });
        }
        nextCurrencyMap.set(
          reservation.store_id,
          (reservation.currency_code ?? "USD").toUpperCase(),
        );
      }
      setStores(storeMap);
      setCurrencyMap(nextCurrencyMap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const groups = useMemo(() => {
    const upcoming: Reservation[] = [];
    const active: Reservation[] = [];
    const past: Reservation[] = [];
    const cancelled: Reservation[] = [];
    const now = Date.now();
    for (const r of reservations) {
      if (r.status === "cancelled" || r.status === "no_show") {
        cancelled.push(r);
      } else if (r.status === "picked_up") {
        active.push(r);
      } else if (r.status === "returned") {
        past.push(r);
      } else if (new Date(r.pickup_at).getTime() > now) {
        upcoming.push(r);
      } else {
        past.push(r);
      }
    }
    return { upcoming, active, past, cancelled };
  }, [reservations]);

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center">
        <div>
          <h1 className="text-xl font-bold">Sign in to see your rentals</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your past and upcoming bookings are linked to your account.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-block text-primary underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>My rentals</title>
      </Helmet>
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">My rentals</h1>
            <p className="text-[11px] text-muted-foreground">
              Signed in as {user.email}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {loyalty && loyalty.totalRentals > 0 && (
          <LoyaltyCard total={loyalty.totalRentals} tier={loyalty.tier} />
        )}

        <Group
          title="Active rentals"
          reservations={groups.active}
          stores={stores}
          currencyMap={currencyMap}
          highlight
        />
        <Group
          title="Upcoming"
          reservations={groups.upcoming}
          stores={stores}
          currencyMap={currencyMap}
        />
        <Group
          title="Past"
          reservations={groups.past}
          stores={stores}
          currencyMap={currencyMap}
        />
        <Group
          title="Cancelled"
          reservations={groups.cancelled}
          stores={stores}
          currencyMap={currencyMap}
          muted
        />

        {reservations.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border">
            <CardContent className="p-10 text-center">
              <Car className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h2 className="mt-3 text-base font-semibold text-foreground">
                No rentals yet
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When you book a car the reservation will show up here.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Group({
  title,
  reservations,
  stores,
  currencyMap,
  highlight,
  muted,
}: {
  title: string;
  reservations: Reservation[];
  stores: Map<string, StoreMini>;
  currencyMap: Map<string, string>;
  highlight?: boolean;
  muted?: boolean;
}) {
  if (reservations.length === 0) return null;
  return (
    <section>
      <h2
        className={cn(
          "mb-2 text-[11px] font-bold uppercase tracking-wider",
          muted
            ? "text-muted-foreground/70"
            : highlight
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-foreground",
        )}
      >
        {title} ({reservations.length})
      </h2>
      <ul className="space-y-2">
        {reservations.map((r) => {
          const s = stores.get(r.store_id);
          return (
            <li key={r.id}>
              <Link
                to={`/car-rental-booking/${r.id}`}
                className={cn(
                  "block rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40",
                  highlight
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : muted
                      ? "border-border/50 opacity-75"
                      : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  {s?.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Car className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">
                        {r.vehicle_label}
                      </p>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {r.confirmation_code}
                      </span>
                      <StatusPill status={r.status} />
                      {r.payment_status && r.payment_status !== "unpaid" && (
                        <PaymentPill status={r.payment_status} />
                      )}
                    </div>
                    <p className="text-[12px] text-foreground/80">
                      {s?.name ?? "Rental store"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.pickup_at).toLocaleDateString()} →{" "}
                      {new Date(r.dropoff_at).toLocaleDateString()} ·{" "}
                      {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
                    </p>
                    {r.pickup_location_name && (
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.pickup_location_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {formatMoneyWith(
                        r.total_cents,
                        currencyMap.get(r.store_id) ?? "USD",
                      )}
                    </p>
                    <PaymentBreakdown
                      reservation={r}
                      currency={currencyMap.get(r.store_id) ?? "USD"}
                    />
                    <p className="mt-1 text-[11px] text-primary inline-flex items-center gap-0.5">
                      View <ExternalLink className="h-3 w-3" />
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Compact pill describing the Stripe payment status. Hidden when the
 * reservation has never been wired to Stripe (payment_status = 'unpaid')
 * so the legacy / manual-payment flow stays uncluttered.
 */
function PaymentPill({ status }: { status: PaymentStatus }) {
  const tone =
    status === "authorized"
      ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
      : status === "processing"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
        : status === "captured" || status === "paid"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          : status === "refund_pending"
            ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
            : status === "refunded"
              ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 opacity-80"
              : status === "failed"
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-muted text-muted-foreground border-border";
  const label =
    status === "authorized"
      ? "deposit held"
      : status === "refund_pending"
        ? "refund pending"
        : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        tone,
      )}
    >
      {label}
    </span>
  );
}

/**
 * One-line summary under the total: explains exactly what's been collected
 * vs what's still owed. Skipped for reservations that aren't wired to
 * Stripe (no payment_status or unpaid).
 */
function PaymentBreakdown({
  reservation,
  currency,
}: {
  reservation: Reservation;
  currency: string;
}) {
  const ps = reservation.payment_status;
  if (!ps || ps === "unpaid") return null;
  const fmt = (c: number) => formatMoneyWith(c, currency);
  const owed = Math.max(
    0,
    reservation.total_cents - reservation.amount_paid_cents,
  );

  let line: string;
  if (ps === "authorized" && reservation.deposit_paid_cents > 0) {
    line = `${fmt(reservation.deposit_paid_cents)} held`;
  } else if (ps === "paid" || ps === "captured") {
    line =
      owed > 0
        ? `${fmt(reservation.amount_paid_cents)} paid · ${fmt(owed)} due`
        : `${fmt(reservation.amount_paid_cents)} paid`;
  } else if (ps === "refunded") {
    line = "Deposit refunded";
  } else if (ps === "refund_pending") {
    line = "Refund processing";
  } else if (ps === "processing") {
    line = "Payment processing";
  } else if (ps === "failed") {
    line = "Payment failed";
  } else {
    return null;
  }
  return <p className="mt-0.5 text-[10px] text-muted-foreground">{line}</p>;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pending"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : status === "confirmed"
        ? "bg-primary/10 text-primary border-primary/30"
        : status === "picked_up"
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          : status === "returned"
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 opacity-75"
            : "bg-muted text-muted-foreground border-border";
  const label =
    status === "no_show"
      ? "no-show"
      : status === "picked_up"
        ? "on rental"
        : status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        tone,
      )}
    >
      {label}
    </span>
  );
}
