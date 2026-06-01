/**
 * BusOperatorConsole - Operator-side management for the bus vertical.
 *
 * A bus operator is a store_profiles row with category='bus'. This console
 * lets the signed-in owner manage Routes, Trips/Schedules, and view/confirm
 * Bookings for their bus store(s). All reads/writes go through the RLS-
 * protected bus_* tables (owner-scoped via is_store_owner).
 *
 * Standalone (not wired into the large AdminStoreEditPage) to keep the new
 * vertical isolated and low-risk.
 * @module BusOperatorConsole
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStoreCategory } from "@/hooks/useOwnerStoreProfile";
import { cn } from "@/lib/utils";
import Bus from "lucide-react/dist/esm/icons/bus";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Clock from "lucide-react/dist/esm/icons/clock";
import Ticket from "lucide-react/dist/esm/icons/ticket";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

// Loose row shapes — the bus_* tables aren't in the generated types yet.
type BusStore = { id: string; name: string; category: string | null };
type Route = {
  id: string; origin: string; destination: string; distance_km: number | null;
  duration_mins: number | null; base_price_cents: number; status: string;
};
type Trip = {
  id: string; route_id: string; depart_date: string; depart_time: string;
  arrive_time: string | null; bus_type: string; total_seats: number;
  price_cents: number; amenities: string[]; status: string;
};
type Booking = {
  id: string; trip_id: string; booking_ref: string | null; seats: string[];
  passenger_count: number; contact_name: string | null; contact_phone: string | null;
  amount_cents: number; status: string; payment_status: string; created_at: string;
};

const db = supabase as unknown as {
  from: (t: string) => any;
};

const AMENITIES = ["wifi", "ac", "charging"] as const;
const dollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (v: string) => Math.max(0, Math.round(parseFloat(v || "0") * 100));

type Tab = "routes" | "trips" | "bookings";

export default function BusOperatorConsole() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stores, setStores] = useState<BusStore[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("routes");

  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  // ── Load the owner's bus stores ──
  useEffect(() => {
    if (!user) { setStoresLoaded(true); return; }
    let active = true;
    (async () => {
      const { data } = await db.from("store_profiles")
        .select("id, name, category")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      const buses = (data || []).filter((s: BusStore) => normalizeStoreCategory(s.category).includes("bus"));
      setStores(buses);
      setStoreId((prev) => prev || buses[0]?.id || "");
      setStoresLoaded(true);
    })();
    return () => { active = false; };
  }, [user]);

  const loadRoutes = useCallback(async () => {
    if (!storeId) return;
    const { data } = await db.from("bus_routes").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setRoutes((data || []) as Route[]);
  }, [storeId]);

  const loadTrips = useCallback(async () => {
    if (!storeId) return;
    const { data } = await db.from("bus_trips").select("*").eq("store_id", storeId).order("depart_date", { ascending: true });
    setTrips((data || []) as Trip[]);
  }, [storeId]);

  const loadBookings = useCallback(async () => {
    if (!storeId) return;
    const { data } = await db.from("bus_bookings").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setBookings((data || []) as Booking[]);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    void loadRoutes(); void loadTrips(); void loadBookings();
  }, [storeId, loadRoutes, loadTrips, loadBookings]);

  const routeLabel = useMemo(() => {
    const m = new Map(routes.map((r) => [r.id, `${r.origin} → ${r.destination}`]));
    return (id: string) => m.get(id) || "—";
  }, [routes]);

  // ── Guards ──
  if (storesLoaded && !user) {
    return (
      <AppLayout title="Bus operator" showBack onBack={() => navigate("/bus")}>
        <Empty icon={Bus} title="Sign in to manage your bus service" cta="Sign in" onCta={() => navigate("/login")} />
      </AppLayout>
    );
  }
  if (storesLoaded && user && stores.length === 0) {
    return (
      <AppLayout title="Bus operator" showBack onBack={() => navigate("/bus")}>
        <Empty
          icon={Bus}
          title="Create a bus operator page"
          desc="You don't have a bus business yet. Create one (choose the “Bus” category) to start adding routes and trips."
          cta="Create a business"
          onCta={() => navigate("/business/new")}
        />
      </AppLayout>
    );
  }

  return (
    <>
      <SEOHead title="ZIVO Bus Operator – Manage Routes, Trips & Bookings" description="Manage your bus routes, schedules and bookings on ZIVO." canonical="/bus/operator" noIndex />
      <AppLayout title="Bus operator" showBack onBack={() => navigate("/bus")}>
        <div className="mx-auto w-full max-w-2xl px-4 py-4 space-y-4">
          {/* Store selector */}
          {stores.length > 1 && (
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold"
            >
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-muted p-1">
            {([["routes", "Routes", MapPin], ["trips", "Trips", Clock], ["bookings", "Bookings", Ticket]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-colors",
                  tab === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {tab === "routes" && <RoutesTab storeId={storeId} routes={routes} reload={loadRoutes} />}
          {tab === "trips" && <TripsTab storeId={storeId} routes={routes} trips={trips} reload={loadTrips} routeLabel={routeLabel} />}
          {tab === "bookings" && <BookingsTab bookings={bookings} reload={loadBookings} routeLabel={routeLabel} trips={trips} />}
        </div>
      </AppLayout>
    </>
  );
}

// ─────────────────────────────── Routes ───────────────────────────────
function RoutesTab({ storeId, routes, reload }: { storeId: string; routes: Route[]; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!origin.trim() || !destination.trim()) { toast.error("Enter origin and destination."); return; }
    setSaving(true);
    const { error } = await db.from("bus_routes").insert({
      store_id: storeId,
      origin: origin.trim(),
      destination: destination.trim(),
      distance_km: distance ? Number(distance) : null,
      duration_mins: duration ? Math.round(Number(duration)) : null,
      base_price_cents: toCents(price),
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error("Couldn't save route."); return; }
    toast.success("Route added.");
    setOrigin(""); setDestination(""); setDistance(""); setDuration(""); setPrice(""); setAdding(false);
    void reload();
  };

  const remove = async (id: string) => {
    const { error } = await db.from("bus_routes").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete (trips may reference it)."); return; }
    void reload();
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => setAdding((v) => !v)} variant={adding ? "outline" : "default"} className="w-full rounded-2xl font-bold">
        <Plus className="mr-1 h-4 w-4" /> {adding ? "Cancel" : "Add route"}
      </Button>

      {adding && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="From"><input value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputCls} placeholder="Phnom Penh" /></Field>
            <Field label="To"><input value={destination} onChange={(e) => setDestination(e.target.value)} className={inputCls} placeholder="Siem Reap" /></Field>
            <Field label="Distance (km)"><input value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="numeric" className={inputCls} placeholder="315" /></Field>
            <Field label="Duration (min)"><input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" className={inputCls} placeholder="300" /></Field>
            <Field label="Base fare ($)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} placeholder="15" /></Field>
          </div>
          <Button onClick={add} disabled={saving} className="w-full rounded-xl font-bold">{saving ? "Saving…" : "Save route"}</Button>
        </div>
      )}

      {routes.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No routes yet.</p>
      ) : routes.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <div>
            <p className="text-sm font-bold text-foreground">{r.origin} → {r.destination}</p>
            <p className="text-[11px] text-muted-foreground">
              {r.distance_km ? `${r.distance_km} km · ` : ""}{r.duration_mins ? `${r.duration_mins} min · ` : ""}from ${dollars(r.base_price_cents)}
            </p>
          </div>
          <button type="button" onClick={() => remove(r.id)} aria-label="Delete route" className="rounded-lg p-2 text-muted-foreground hover:text-rose-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────── Trips ───────────────────────────────
function TripsTab({ storeId, routes, trips, reload, routeLabel }: {
  storeId: string; routes: Route[]; trips: Trip[]; reload: () => Promise<void>; routeLabel: (id: string) => string;
}) {
  const [adding, setAdding] = useState(false);
  const [routeId, setRouteId] = useState("");
  const [date, setDate] = useState("");
  const [depart, setDepart] = useState("08:00");
  const [arrive, setArrive] = useState("");
  const [busType, setBusType] = useState("VIP Coach");
  const [seats, setSeats] = useState("40");
  const [price, setPrice] = useState("");
  const [amenities, setAmenities] = useState<string[]>(["ac"]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!routeId && routes[0]) setRouteId(routes[0].id); }, [routes, routeId]);

  const add = async () => {
    if (!routeId) { toast.error("Create a route first."); return; }
    if (!date || !depart) { toast.error("Pick a date and departure time."); return; }
    setSaving(true);
    const route = routes.find((r) => r.id === routeId);
    const { error } = await db.from("bus_trips").insert({
      store_id: storeId,
      route_id: routeId,
      depart_date: date,
      depart_time: depart,
      arrive_time: arrive || null,
      bus_type: busType.trim() || "Coach",
      total_seats: Math.min(80, Math.max(1, Math.round(Number(seats) || 40))),
      price_cents: price ? toCents(price) : (route?.base_price_cents ?? 0),
      amenities,
      status: "scheduled",
    });
    setSaving(false);
    if (error) { toast.error("Couldn't save trip."); return; }
    toast.success("Trip scheduled.");
    setAdding(false); setDate(""); setArrive(""); setPrice("");
    void reload();
  };

  const cancel = async (id: string) => {
    const { error } = await db.from("bus_trips").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("Couldn't cancel trip."); return; }
    void reload();
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => setAdding((v) => !v)} variant={adding ? "outline" : "default"} className="w-full rounded-2xl font-bold" disabled={routes.length === 0}>
        <Plus className="mr-1 h-4 w-4" /> {adding ? "Cancel" : "Schedule trip"}
      </Button>
      {routes.length === 0 && <p className="text-center text-xs text-muted-foreground">Add a route first.</p>}

      {adding && routes.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <Field label="Route">
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className={inputCls}>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Bus type"><input value={busType} onChange={(e) => setBusType(e.target.value)} className={inputCls} /></Field>
            <Field label="Departs"><input type="time" value={depart} onChange={(e) => setDepart(e.target.value)} className={inputCls} /></Field>
            <Field label="Arrives"><input type="time" value={arrive} onChange={(e) => setArrive(e.target.value)} className={inputCls} /></Field>
            <Field label="Total seats"><input value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" className={inputCls} /></Field>
            <Field label="Fare ($/seat)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} placeholder="route default" /></Field>
          </div>
          <Field label="Amenities">
            <div className="flex gap-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmenities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])}
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold capitalize", amenities.includes(a) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  {a === "ac" ? "A/C" : a}
                </button>
              ))}
            </div>
          </Field>
          <Button onClick={add} disabled={saving} className="w-full rounded-xl font-bold">{saving ? "Saving…" : "Schedule trip"}</Button>
        </div>
      )}

      {trips.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No trips scheduled.</p>
      ) : trips.map((tp) => (
        <div key={tp.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <div>
            <p className="text-sm font-bold text-foreground">{routeLabel(tp.route_id)}</p>
            <p className="text-[11px] text-muted-foreground">
              {tp.depart_date} · {tp.depart_time}{tp.arrive_time ? `–${tp.arrive_time}` : ""} · {tp.bus_type} · ${dollars(tp.price_cents)} · {tp.total_seats} seats
            </p>
          </div>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tp.status === "scheduled" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
            {tp.status}
          </span>
          {tp.status === "scheduled" && (
            <button type="button" onClick={() => cancel(tp.id)} className="ml-2 text-[11px] font-bold text-rose-500">Cancel</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────── Bookings ───────────────────────────────
function BookingsTab({ bookings, reload, routeLabel, trips }: {
  bookings: Booking[]; reload: () => Promise<void>; routeLabel: (id: string) => string; trips: Trip[];
}) {
  const tripRoute = useMemo(() => {
    const m = new Map(trips.map((t) => [t.id, t.route_id]));
    return (tripId: string) => routeLabel(m.get(tripId) || "");
  }, [trips, routeLabel]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await db.from("bus_bookings").update({ status }).eq("id", id);
    if (error) { toast.error("Couldn't update booking."); return; }
    toast.success(status === "confirmed" ? "Booking confirmed." : "Booking cancelled.");
    void reload();
  };

  if (bookings.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</p>;
  }

  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <div key={b.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">{b.booking_ref || b.id.slice(0, 8)}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold",
              b.status === "confirmed" ? "bg-emerald-500/15 text-emerald-600" : b.status === "cancelled" ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-600")}>
              {b.status}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{tripRoute(b.trip_id)}</p>
          <p className="text-[11px] text-muted-foreground">
            Seats {(b.seats || []).join(", ") || "—"} · {b.contact_name || "—"} {b.contact_phone ? `· ${b.contact_phone}` : ""} · ${dollars(b.amount_cents)} · {b.payment_status}
          </p>
          {b.status === "hold" && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => setStatus(b.id, "confirmed")} className="h-8 rounded-lg text-xs font-bold">Confirm</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(b.id, "cancelled")} className="h-8 rounded-lg text-xs font-bold">Cancel</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────── shared ───────────────────────────────
const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Empty({ icon: Icon, title, desc, cta, onCta }: { icon: typeof Bus; title: string; desc?: string; cta: string; onCta: () => void }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      </div>
      <Button onClick={onCta} className="h-11 rounded-2xl px-6 font-bold">{cta}</Button>
    </div>
  );
}
