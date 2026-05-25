/**
 * Customer self-service portal — show all the user's car-rental reservations
 * across every store, grouped by status.
 *
 * Auth required: the user must be signed in. We look up car_rental_customers
 * rows linked to this user (via user_id) and join their reservations.
 *
 * Route: /my-rentals
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Car, Calendar, MapPin, Loader2, AlertTriangle, ExternalLink, QrCode, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
}

interface StoreMini {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function MyCarRentalsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stores, setStores] = useState<Map<string, StoreMini>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);

      // Find every car_rental_customers row linked to this user.
      const { data: custRows, error: custErr } = await supabase
        .from("car_rental_customers")
        .select("id, store_id")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (custErr) {
        setError("Couldn't load your rentals.");
        setLoading(false);
        return;
      }
      const customerIds = (custRows ?? []).map((r: any) => r.id as string);
      if (customerIds.length === 0) {
        setReservations([]);
        setLoading(false);
        return;
      }

      const { data: resRows, error: resErr } = await supabase
        .from("car_rental_reservations")
        .select("id, store_id, vehicle_label, vehicle_category, pickup_at, dropoff_at, rental_days, total_cents, status, confirmation_code, pickup_location_name")
        .in("customer_id", customerIds)
        .order("pickup_at", { ascending: false })
        .limit(100);

      if (cancelled) return;
      if (resErr) {
        setError("Couldn't load your rentals.");
        setLoading(false);
        return;
      }
      const rs = (resRows ?? []) as unknown as Reservation[];
      setReservations(rs);

      const storeIds = Array.from(new Set(rs.map((r) => r.store_id)));
      if (storeIds.length > 0) {
        const { data: storeRows } = await supabase
          .from("store_profiles")
          .select("id, name, slug, logo_url")
          .in("id", storeIds);
        const map = new Map<string, StoreMini>();
        for (const s of (storeRows ?? []) as any[]) {
          map.set(s.id, { id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url });
        }
        setStores(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
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

  if (authLoading || loading) {
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
          <p className="mt-1 text-sm text-muted-foreground">Your past and upcoming bookings are linked to your account.</p>
          <Link to="/login" className="mt-4 inline-block text-primary underline">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>My rentals</title></Helmet>
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">My rentals</h1>
            <p className="text-[11px] text-muted-foreground">Signed in as {user.email}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* Confirmation code lookup */}
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <QrCode className="h-4 w-4 text-primary" /> Find a booking by code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); if (lookupCode.trim()) navigate(`/car-rental-booking/${lookupCode.trim().toUpperCase()}`); }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 font-mono uppercase"
                  placeholder="e.g. AB12CD34"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                />
              </div>
              <Button type="submit" disabled={!lookupCode.trim()}>Look up</Button>
            </form>
          </CardContent>
        </Card>

        <Group title="Active rentals" reservations={groups.active} stores={stores} highlight />
        <Group title="Upcoming" reservations={groups.upcoming} stores={stores} />
        <Group title="Past" reservations={groups.past} stores={stores} />
        <Group title="Cancelled" reservations={groups.cancelled} stores={stores} muted />

        {reservations.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border">
            <CardContent className="p-10 text-center">
              <Car className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h2 className="mt-3 text-base font-semibold text-foreground">No rentals yet</h2>
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

function Group({ title, reservations, stores, highlight, muted }: {
  title: string;
  reservations: Reservation[];
  stores: Map<string, StoreMini>;
  highlight?: boolean;
  muted?: boolean;
}) {
  if (reservations.length === 0) return null;
  return (
    <section>
      <h2 className={cn(
        "mb-2 text-[11px] font-bold uppercase tracking-wider",
        muted ? "text-muted-foreground/70" : highlight ? "text-emerald-600 dark:text-emerald-300" : "text-foreground",
      )}>
        {title} ({reservations.length})
      </h2>
      <ul className="space-y-2">
        {reservations.map((r) => {
          const s = stores.get(r.store_id);
          return (
            <li key={r.id}>
              <Link
                to={`/car-rental-booking/${r.confirmation_code}`}
                className={cn(
                  "block rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40",
                  highlight ? "border-emerald-500/30 bg-emerald-500/5" : muted ? "border-border/50 opacity-75" : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  {s?.logo_url ? (
                    <img src={s.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Car className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{r.vehicle_label}</p>
                      <span className="font-mono text-[10px] text-muted-foreground">{r.confirmation_code}</span>
                      <StatusPill status={r.status} />
                    </div>
                    <p className="text-[12px] text-foreground/80">{s?.name ?? "Rental store"}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.pickup_at).toLocaleDateString()} → {new Date(r.dropoff_at).toLocaleDateString()} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
                    </p>
                    {r.pickup_location_name && (
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.pickup_location_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</p>
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

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : status === "confirmed" ? "bg-primary/10 text-primary border-primary/30"
    : status === "picked_up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : status === "returned" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 opacity-75"
    : "bg-muted text-muted-foreground border-border";
  const label = status === "no_show" ? "no-show" : status === "picked_up" ? "on rental" : status;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", tone)}>
      {label}
    </span>
  );
}
