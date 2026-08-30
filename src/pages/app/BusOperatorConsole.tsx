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
import StoreOwnerLayout from "@/components/admin/StoreOwnerLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage, isEdgeFunctionMissing } from "@/lib/edgeFunctionError";
import { normalizeStoreCategory } from "@/hooks/useOwnerStoreProfile";
import { cn } from "@/lib/utils";
import StorePaymentSection from "@/components/admin/StorePaymentSection";
import { uploadStoreAsset } from "@/pages/admin/utils/uploadStoreAsset";
import { BUS_VEHICLE_TYPES, getBusVehicleType, BUS_AMENITIES, busAmenityLabel } from "@/config/busVehicleTypes";
import Bus from "lucide-react/dist/esm/icons/bus";
import Store from "lucide-react/dist/esm/icons/store";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Clock from "lucide-react/dist/esm/icons/clock";
import Ticket from "lucide-react/dist/esm/icons/ticket";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Users from "lucide-react/dist/esm/icons/users";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import ListChecks from "lucide-react/dist/esm/icons/list-checks";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Truck from "lucide-react/dist/esm/icons/truck";
import UserIcon from "lucide-react/dist/esm/icons/user";
import Tag from "lucide-react/dist/esm/icons/tag";
import Star from "lucide-react/dist/esm/icons/star";

// Loose row shapes — the bus_* tables aren't in the generated types yet.
type BusStore = { id: string; name: string; category: string | null; logo_url: string | null; description: string | null; phone: string | null; address: string | null };
type Route = {
  id: string; origin: string; destination: string; distance_km: number | null;
  duration_mins: number | null; base_price_cents: number; status: string;
};
type Trip = {
  id: string; route_id: string; depart_date: string; depart_time: string;
  arrive_time: string | null; bus_type: string; total_seats: number;
  price_cents: number; amenities: string[]; status: string;
  vehicle_id: string | null; driver_id: string | null;
};
type Vehicle = {
  id: string; label: string; plate: string | null; vehicle_type: string;
  total_seats: number; seat_layout: string; status: string;
};
type Driver = {
  id: string; name: string; phone: string | null; license_number: string | null; status: string;
};
type Stop = {
  id: string; route_id: string; name: string; stop_order: number; offset_mins: number | null; kind: string;
};
type Promo = {
  id: string; code: string; description: string | null; discount_type: string; discount_value: number;
  min_fare_cents: number; max_uses: number | null; used_count: number;
  starts_on: string | null; ends_on: string | null; status: string;
};
type Review = {
  id: string; trip_id: string | null; rating: number; comment: string | null;
  reply: string | null; replied_at: string | null; status: string; created_at: string;
};
type Booking = {
  id: string; trip_id: string; booking_ref: string | null; seats: string[];
  passenger_count: number; contact_name: string | null; contact_phone: string | null;
  amount_cents: number; status: string; payment_status: string; created_at: string;
  boarded_at: string | null;
};

const db = supabase as unknown as {
  from: (t: string) => any;
};

const dollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (v: string) => Math.max(0, Math.round(parseFloat(v || "0") * 100));
const todayISO = () => new Date().toISOString().slice(0, 10);

type Tab = "profile" | "overview" | "routes" | "trips" | "fleet" | "bookings" | "promotions" | "reviews" | "payments" | "reports";

const NAV: { id: Tab; label: string; icon: typeof Bus }[] = [
  { id: "profile", label: "Profile", icon: Store },
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "routes", label: "Routes", icon: MapPin },
  { id: "trips", label: "Trips", icon: Clock },
  { id: "fleet", label: "Fleet & Drivers", icon: Truck },
  { id: "bookings", label: "Bookings", icon: Ticket },
  { id: "promotions", label: "Promotions", icon: Tag },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "payments", label: "Payments", icon: DollarSign },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function BusOperatorConsole() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stores, setStores] = useState<BusStore[]>([]);
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("overview");

  const [routes, setRoutes] = useState<Route[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  // ── Load the owner's bus stores ──
  const loadStores = useCallback(async () => {
    if (!user) { setStoresLoaded(true); return; }
    const { data } = await db.from("store_profiles")
      .select("id, name, category, logo_url, description, phone, address")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    const buses = (data || []).filter((s: BusStore) => {
      const norm = normalizeStoreCategory(s.category);
      return norm.includes("bus") || norm.includes("van");
    });
    setStores(buses);
    setStoreId((prev) => prev || buses[0]?.id || "");
    setStoresLoaded(true);
  }, [user]);

  useEffect(() => { void loadStores(); }, [loadStores]);

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

  const loadFleet = useCallback(async () => {
    if (!storeId) return;
    const [v, d] = await Promise.all([
      db.from("bus_vehicles").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
      db.from("bus_drivers").select("*").eq("store_id", storeId).order("created_at", { ascending: false }),
    ]);
    setVehicles((v.data || []) as Vehicle[]);
    setDrivers((d.data || []) as Driver[]);
  }, [storeId]);

  const loadPromos = useCallback(async () => {
    if (!storeId) return;
    const { data } = await db.from("bus_promos").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setPromos((data || []) as Promo[]);
  }, [storeId]);

  const loadReviews = useCallback(async () => {
    if (!storeId) return;
    const { data } = await db.from("bus_reviews").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
    setReviews((data || []) as Review[]);
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    void loadRoutes(); void loadTrips(); void loadBookings(); void loadFleet(); void loadPromos(); void loadReviews();
  }, [storeId, loadRoutes, loadTrips, loadBookings, loadFleet, loadPromos, loadReviews]);

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
          onCta={() => navigate("/business/new?new=1")}
        />
      </AppLayout>
    );
  }

  const activeStore = stores.find((s) => s.id === storeId);
  const activeLabel = NAV.find((n) => n.id === tab)?.label ?? "Bus operator";

  return (
    <>
      <SEOHead title="ZIVO Bus Operator – Manage Routes, Trips & Bookings" description="Manage your bus routes, schedules and bookings on ZIVO." canonical="/bus/operator" noIndex />
      <StoreOwnerLayout
        title={activeLabel}
        storeId={storeId}
        storeName={activeStore?.name}
        storeLogoUrl={activeStore?.logo_url || undefined}
        storeCategory="bus"
        activeTab={tab}
        onTabChange={(t) => setTab(t as Tab)}
      >
        {/* Store selector */}
        {stores.length > 1 && (
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            className="mb-4 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold md:max-w-xs"
          >
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}

        <div className="mx-auto w-full max-w-5xl space-y-4">
          {tab === "profile" && <ProfileTab store={activeStore} onSaved={loadStores} />}
          {tab === "overview" && <OverviewTab routes={routes} trips={trips} bookings={bookings} reviews={reviews} promos={promos} routeLabel={routeLabel} onNavigate={setTab} />}
          {tab === "routes" && <RoutesTab storeId={storeId} routes={routes} reload={loadRoutes} />}
          {tab === "trips" && <TripsTab storeId={storeId} routes={routes} trips={trips} vehicles={vehicles} drivers={drivers} reload={loadTrips} routeLabel={routeLabel} />}
          {tab === "fleet" && <FleetTab storeId={storeId} vehicles={vehicles} drivers={drivers} reload={loadFleet} />}
          {tab === "bookings" && <BookingsTab bookings={bookings} reload={loadBookings} routeLabel={routeLabel} trips={trips} />}
          {tab === "promotions" && <PromotionsTab storeId={storeId} promos={promos} reload={loadPromos} />}
          {tab === "reviews" && <ReviewsTab reviews={reviews} reload={loadReviews} routeLabel={routeLabel} trips={trips} />}
          {tab === "payments" && <PaymentsTab storeId={storeId} />}
          {tab === "reports" && <ReportsTab routes={routes} trips={trips} bookings={bookings} routeLabel={routeLabel} />}
        </div>
      </StoreOwnerLayout>
    </>
  );
}

// ─────────────────────────────── Overview ───────────────────────────────
function OverviewTab({ routes, trips, bookings, reviews, promos, routeLabel, onNavigate }: {
  routes: Route[]; trips: Trip[]; bookings: Booking[]; reviews: Review[]; promos: Promo[]; routeLabel: (id: string) => string; onNavigate: (t: Tab) => void;
}) {
  const today = todayISO();
  const scheduled = trips.filter((t) => t.status === "scheduled");
  const upcoming = scheduled
    .filter((t) => t.depart_date >= today)
    .sort((a, b) => `${a.depart_date}${a.depart_time}`.localeCompare(`${b.depart_date}${b.depart_time}`));
  const pending = bookings.filter((b) => b.status === "hold");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const seatsSold = confirmed.reduce((n, b) => n + (b.passenger_count || (b.seats?.length ?? 0)), 0);
  const revenueCents = bookings
    .filter((b) => b.payment_status === "captured" || b.status === "confirmed")
    .reduce((n, b) => n + (b.amount_cents || 0), 0);
  const publishedReviews = reviews.filter((r) => r.status === "published");
  const avgRating = publishedReviews.length
    ? (publishedReviews.reduce((n, r) => n + r.rating, 0) / publishedReviews.length).toFixed(1)
    : "—";
  const activePromos = promos.filter((p) => p.status === "active").length;

  if (routes.length === 0 && trips.length === 0 && bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Bus className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-base font-black text-foreground">Set up your bus service</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Add a route, schedule a trip, and your buses show up in customer search instantly.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={() => onNavigate("routes")} className="rounded-xl font-bold"><Plus className="mr-1 h-4 w-4" /> Add a route</Button>
          <Button variant="outline" onClick={() => onNavigate("trips")} className="rounded-xl font-bold">Schedule a trip</Button>
        </div>
      </div>
    );
  }

  const stats: { label: string; value: string; sub?: string; icon: typeof Bus; tint: string }[] = [
    { label: "Active routes", value: String(routes.length), icon: MapPin, tint: "bg-sky-500/10 text-sky-500" },
    { label: "Scheduled trips", value: String(scheduled.length), icon: Clock, tint: "bg-violet-500/10 text-violet-500" },
    { label: "Bookings", value: String(bookings.length), sub: pending.length ? `${pending.length} pending` : undefined, icon: Ticket, tint: "bg-amber-500/10 text-amber-500" },
    { label: "Revenue", value: `$${dollars(revenueCents)}`, icon: DollarSign, tint: "bg-emerald-500/10 text-emerald-500" },
    { label: "Seats sold", value: String(seatsSold), icon: Users, tint: "bg-rose-500/10 text-rose-500" },
    { label: "Upcoming departures", value: String(upcoming.length), icon: Calendar, tint: "bg-indigo-500/10 text-indigo-500" },
    { label: "Avg rating", value: avgRating, sub: publishedReviews.length ? `${publishedReviews.length} review${publishedReviews.length === 1 ? "" : "s"}` : undefined, icon: Star, tint: "bg-amber-500/10 text-amber-500" },
    { label: "Active promos", value: String(activePromos), icon: Tag, tint: "bg-teal-500/10 text-teal-500" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className={cn("mb-2 flex h-9 w-9 items-center justify-center rounded-xl", s.tint)}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black leading-none text-foreground">{s.value}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              {s.label}{s.sub ? <span className="ml-1 text-amber-600">· {s.sub}</span> : null}
            </p>
          </div>
        ))}
      </div>

      {pending.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigate("bookings")}
          className="flex w-full items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600"><Ticket className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-bold text-foreground">{pending.length} booking{pending.length > 1 ? "s" : ""} awaiting confirmation</p>
              <p className="text-[11px] text-muted-foreground">Review and confirm to capture payment.</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground"><TrendingUp className="h-4 w-4 text-primary" /> Next departures</h3>
          <button type="button" onClick={() => onNavigate("trips")} className="flex items-center gap-1 text-xs font-bold text-primary">All trips <ArrowRight className="h-3 w-3" /></button>
        </div>
        {upcoming.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">No upcoming departures.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{routeLabel(t.route_id)}</p>
                  <p className="text-[11px] text-muted-foreground">{t.depart_date} · {t.depart_time} · {t.bus_type}</p>
                </div>
                <span className="shrink-0 text-sm font-black text-foreground">${dollars(t.price_cents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground"><Ticket className="h-4 w-4 text-primary" /> Recent bookings</h3>
          <button type="button" onClick={() => onNavigate("bookings")} className="flex items-center gap-1 text-xs font-bold text-primary">All bookings <ArrowRight className="h-3 w-3" /></button>
        </div>
        {bookings.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <div className="space-y-2">
            {bookings.slice(0, 5).map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{b.contact_name || b.booking_ref || b.id.slice(0, 8)}</p>
                  <p className="text-[11px] text-muted-foreground">{(b.seats?.length || b.passenger_count) ?? 0} seat(s) · ${dollars(b.amount_cents)}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  b.status === "confirmed" ? "bg-emerald-500/15 text-emerald-600" : b.status === "cancelled" ? "bg-rose-500/15 text-rose-500" : "bg-amber-500/15 text-amber-600")}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
  const [openStops, setOpenStops] = useState<string | null>(null);

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
        <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">{r.origin} → {r.destination}</p>
              <p className="text-[11px] text-muted-foreground">
                {r.distance_km ? `${r.distance_km} km · ` : ""}{r.duration_mins ? `${r.duration_mins} min · ` : ""}from ${dollars(r.base_price_cents)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setOpenStops((v) => v === r.id ? null : r.id)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-primary">
                <MapPin className="h-3.5 w-3.5" /> Stops
              </button>
              <button type="button" onClick={() => remove(r.id)} aria-label="Delete route" className="rounded-lg p-2 text-muted-foreground hover:text-rose-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {openStops === r.id && (
            <div className="mt-3 border-t border-border pt-3">
              <RouteStopsManager storeId={storeId} routeId={r.id} origin={r.origin} destination={r.destination} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Stops manager for a single route (intermediate boarding/drop points) ───
function RouteStopsManager({ storeId, routeId, origin, destination }: {
  storeId: string; routeId: string; origin: string; destination: string;
}) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [name, setName] = useState("");
  const [offset, setOffset] = useState("");
  const [kind, setKind] = useState<string>("both");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from("bus_route_stops").select("*").eq("route_id", routeId).order("stop_order", { ascending: true });
    setStops((data || []) as Stop[]);
  }, [routeId]);

  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (!name.trim()) { toast.error("Name the stop."); return; }
    setSaving(true);
    const { error } = await db.from("bus_route_stops").insert({
      store_id: storeId,
      route_id: routeId,
      name: name.trim(),
      stop_order: stops.length,
      offset_mins: offset ? Math.max(0, Math.round(Number(offset))) : null,
      kind,
    });
    setSaving(false);
    if (error) { toast.error("Couldn't add stop."); return; }
    setName(""); setOffset(""); setKind("both");
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await db.from("bus_route_stops").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete stop."); return; }
    void load();
  };

  const kindLabel = (k: string) => k === "pickup" ? "Pickup" : k === "dropoff" ? "Drop-off" : "Pickup & drop-off";

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-muted-foreground">Boarding points between <span className="text-foreground">{origin}</span> and <span className="text-foreground">{destination}</span>.</p>

      <div className="space-y-1.5">
        {stops.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No intermediate stops — passengers board at {origin}.</p>
        ) : stops.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-2.5 py-1.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{kindLabel(s.kind)}{s.offset_mins != null ? ` · +${s.offset_mins} min` : ""}</p>
              </div>
            </div>
            <button type="button" onClick={() => remove(s.id)} aria-label="Delete stop" className="rounded-lg p-1.5 text-muted-foreground hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2">
        <Field label="Stop name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Kampong Cham" /></Field>
        <Field label="Mins from start"><input value={offset} onChange={(e) => setOffset(e.target.value)} inputMode="numeric" className={inputCls} placeholder="120" /></Field>
        <Field label="Type">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
            <option value="both">Pickup & drop-off</option>
            <option value="pickup">Pickup only</option>
            <option value="dropoff">Drop-off only</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button onClick={add} disabled={saving} className="w-full rounded-xl font-bold"><Plus className="mr-1 h-4 w-4" /> Add stop</Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────── Trips ───────────────────────────────
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function TripsTab({ storeId, routes, trips, vehicles, drivers, reload, routeLabel }: {
  storeId: string; routes: Route[]; trips: Trip[]; vehicles: Vehicle[]; drivers: Driver[]; reload: () => Promise<void>; routeLabel: (id: string) => string;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [date, setDate] = useState("");
  const [depart, setDepart] = useState("08:00");
  const [arrive, setArrive] = useState("");
  const [busType, setBusType] = useState<string>(BUS_VEHICLE_TYPES[0].value);
  const [seats, setSeats] = useState(String(BUS_VEHICLE_TYPES[0].defaultSeats));
  const [price, setPrice] = useState("");
  const [amenities, setAmenities] = useState<string[]>([...BUS_VEHICLE_TYPES[0].amenities]);
  const [repeat, setRepeat] = useState<"none" | "daily" | "weekly">("none");
  const [repeatCount, setRepeatCount] = useState("7");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [notifyId, setNotifyId] = useState<string | null>(null);
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifying, setNotifying] = useState(false);

  useEffect(() => { if (!routeId && routes[0]) setRouteId(routes[0].id); }, [routes, routeId]);

  // Picking a vehicle type pre-fills typical seats + amenities for that type;
  // the operator can still tweak both afterwards.
  const applyVehicleType = (value: string) => {
    setBusType(value);
    const vt = getBusVehicleType(value);
    if (vt) {
      setSeats(String(vt.defaultSeats));
      setAmenities([...vt.amenities]);
    }
  };

  // Assigning a saved vehicle pre-fills the trip's seats + vehicle type from
  // that vehicle's spec (operator can still override).
  const applyVehicle = (id: string) => {
    setVehicleId(id);
    const v = vehicles.find((x) => x.id === id);
    if (v) {
      setBusType(v.vehicle_type);
      setSeats(String(v.total_seats));
    }
  };

  const resetForm = () => {
    setEditingId(null); setAdding(false);
    setDate(""); setArrive(""); setPrice("");
    setVehicleId(""); setDriverId("");
    setRepeat("none"); setRepeatCount("7"); setWeekdays([]);
  };

  const beginEdit = (tp: Trip) => {
    setAdding(false);
    setEditingId(tp.id);
    setRouteId(tp.route_id);
    setVehicleId(tp.vehicle_id || "");
    setDriverId(tp.driver_id || "");
    setDate(tp.depart_date);
    setDepart(tp.depart_time);
    setArrive(tp.arrive_time || "");
    setBusType(tp.bus_type);
    setSeats(String(tp.total_seats));
    setPrice(dollars(tp.price_cents));
    setAmenities([...(tp.amenities || [])]);
    setRepeat("none");
  };

  // Build the list of departure dates implied by the recurrence settings.
  const buildDates = (): string[] => {
    if (repeat === "none") return [date];
    const n = Math.min(60, Math.max(1, Math.round(Number(repeatCount) || 1)));
    if (repeat === "daily") return Array.from({ length: n }, (_, i) => addDays(date, i));
    // weekly: scan n weeks of days, keep selected weekdays (incl. start date's own).
    const picks = weekdays.length ? weekdays : [new Date(`${date}T00:00:00`).getDay()];
    const out: string[] = [];
    for (let i = 0; i < n * 7; i++) {
      const iso = addDays(date, i);
      if (picks.includes(new Date(`${iso}T00:00:00`).getDay())) out.push(iso);
    }
    return out;
  };

  const submit = async () => {
    if (!routeId) { toast.error("Create a route first."); return; }
    if (!date || !depart) { toast.error("Pick a date and departure time."); return; }
    setSaving(true);
    const route = routes.find((r) => r.id === routeId);
    const base = {
      store_id: storeId,
      route_id: routeId,
      depart_time: depart,
      arrive_time: arrive || null,
      bus_type: busType.trim() || "Coach",
      total_seats: Math.min(80, Math.max(1, Math.round(Number(seats) || 40))),
      price_cents: price ? toCents(price) : (route?.base_price_cents ?? 0),
      amenities,
      vehicle_id: vehicleId || null,
      driver_id: driverId || null,
    };

    if (editingId) {
      const { error } = await db.from("bus_trips").update({ ...base, depart_date: date }).eq("id", editingId);
      setSaving(false);
      if (error) { toast.error("Couldn't update trip."); return; }
      toast.success("Trip updated.");
      resetForm();
      void reload();
      return;
    }

    const dates = buildDates();
    const rows = dates.map((d) => ({ ...base, depart_date: d, status: "scheduled" }));
    const { error } = await db.from("bus_trips").insert(rows);
    setSaving(false);
    if (error) { toast.error("Couldn't save trip."); return; }
    toast.success(rows.length > 1 ? `${rows.length} trips scheduled.` : "Trip scheduled.");
    resetForm();
    void reload();
  };

  const cancel = async (tp: Trip) => {
    const { error } = await db.from("bus_trips").update({ status: "cancelled" }).eq("id", tp.id);
    if (error) { toast.error("Couldn't cancel trip."); return; }
    const { data } = await db.from("bus_bookings").select("id, customer_id, status").eq("trip_id", tp.id);
    const active = (data || []).filter((b: any) => b.status !== "cancelled");

    // Release/refund each active booking (best-effort; the edge function voids
    // an authorization or refunds a capture). Falls back to marking cancelled.
    for (const b of active) {
      try {
        const { error: rErr } = await supabase.functions.invoke("capture-bus-payment", { body: { booking_id: b.id, action: "refund" } });
        if (rErr) throw rErr;
      } catch {
        await db.from("bus_bookings").update({ status: "cancelled" }).eq("id", b.id);
      }
    }

    // Notify booked passengers with a ZIVO account that the trip is off.
    const recipients = [...new Set(active
      .filter((b: any) => b.customer_id)
      .map((b: any) => b.customer_id as string))];
    if (recipients.length > 0) {
      const rows = recipients.map((uid) => ({
        user_id: uid,
        channel: "in_app",
        category: "operational",
        template: "bus_trip_update",
        title: `${routeLabel(tp.route_id)} · ${tp.depart_date}`,
        body: presetMsg(tp, "cancel"),
        action_url: "/bus/tickets",
        event_type: "bus_trip_update",
        role: "customer",
        status: "sent",
        sent_at: new Date().toISOString(),
        metadata: { trip_id: tp.id, kind: "cancellation" },
      }));
      await db.from("notifications").insert(rows);
      toast.success(`Trip cancelled · ${recipients.length} passenger${recipients.length === 1 ? "" : "s"} notified.`);
    } else {
      toast.success("Trip cancelled.");
    }
    void reload();
  };

  // Quick-fill presets for the passenger notification composer.
  const presetMsg = (tp: Trip, kind: "reminder" | "delay" | "cancel") => {
    const route = routeLabel(tp.route_id);
    if (kind === "reminder") return `Reminder: your bus ${route} departs ${tp.depart_date} at ${tp.depart_time}. Please arrive 30 minutes early.`;
    if (kind === "delay") return `Update: your bus ${route} on ${tp.depart_date} (${tp.depart_time}) is delayed. New departure time: `;
    return `We're sorry — your bus ${route} on ${tp.depart_date} at ${tp.depart_time} has been cancelled. Please contact us about a refund or rebooking.`;
  };

  const openNotify = (tp: Trip) => {
    setNotifyId(tp.id);
    setNotifyMsg(presetMsg(tp, "reminder"));
  };

  // Notify booked passengers that have a ZIVO account (in-app inbox). Guests
  // without an account can't receive an in-app message.
  const sendNotify = async (tp: Trip) => {
    if (!notifyMsg.trim()) { toast.error("Write a message."); return; }
    setNotifying(true);
    const { data } = await db.from("bus_bookings").select("customer_id, status").eq("trip_id", tp.id);
    const recipients = [...new Set((data || [])
      .filter((b: any) => b.customer_id && b.status !== "cancelled")
      .map((b: any) => b.customer_id as string))];
    if (recipients.length === 0) {
      setNotifying(false);
      toast.error("No passengers with a ZIVO account to notify.");
      return;
    }
    const rows = recipients.map((uid) => ({
      user_id: uid,
      channel: "in_app",
      category: "operational",
      template: "bus_trip_update",
      title: `${routeLabel(tp.route_id)} · ${tp.depart_date}`,
      body: notifyMsg.trim(),
      action_url: "/bus/tickets",
      event_type: "bus_trip_update",
      role: "customer",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { trip_id: tp.id },
    }));
    const { error } = await db.from("notifications").insert(rows);
    setNotifying(false);
    if (error) { toast.error("Couldn't send notifications."); return; }
    toast.success(`Notified ${recipients.length} passenger${recipients.length === 1 ? "" : "s"}.`);
    setNotifyId(null); setNotifyMsg("");
  };

  const formOpen = adding || editingId !== null;
  const previewCount = !editingId && repeat !== "none" && date ? buildDates().length : 0;

  return (
    <div className="space-y-3">
      <Button onClick={() => { if (formOpen) resetForm(); else setAdding(true); }} variant={formOpen ? "outline" : "default"} className="w-full rounded-2xl font-bold" disabled={routes.length === 0}>
        <Plus className="mr-1 h-4 w-4" /> {formOpen ? "Cancel" : "Schedule trip"}
      </Button>
      {routes.length === 0 && <p className="text-center text-xs text-muted-foreground">Add a route first.</p>}

      {formOpen && routes.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          {editingId && <p className="text-xs font-bold text-primary">Editing trip</p>}
          <Field label="Route">
            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} className={inputCls}>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.origin} → {r.destination}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={editingId ? "Date" : "Start date"}><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
            <Field label="Vehicle type">
              <select value={busType} onChange={(e) => applyVehicleType(e.target.value)} className={inputCls}>
                {BUS_VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Assign vehicle">
              <select value={vehicleId} onChange={(e) => applyVehicle(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}{v.plate ? ` (${v.plate})` : ""}</option>)}
              </select>
            </Field>
            <Field label="Assign driver">
              <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className={inputCls}>
                <option value="">— none —</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="Departs"><input type="time" value={depart} onChange={(e) => setDepart(e.target.value)} className={inputCls} /></Field>
            <Field label="Arrives"><input type="time" value={arrive} onChange={(e) => setArrive(e.target.value)} className={inputCls} /></Field>
            <Field label="Total seats"><input value={seats} onChange={(e) => setSeats(e.target.value)} inputMode="numeric" className={inputCls} /></Field>
            <Field label="Fare ($/seat)"><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={inputCls} placeholder="route default" /></Field>
          </div>
          <Field label="Amenities">
            <div className="flex flex-wrap gap-2">
              {BUS_AMENITIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmenities((prev) => prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value])}
                  className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", amenities.includes(value) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {/* Recurrence — only when creating, not editing a single trip. */}
          {!editingId && (
            <Field label="Repeat">
              <div className="space-y-2">
                <div className="flex gap-1 rounded-xl bg-muted p-1">
                  {(["none", "daily", "weekly"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRepeat(r)}
                      className={cn("flex-1 rounded-lg py-1.5 text-xs font-bold capitalize transition-colors", repeat === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                      {r === "none" ? "One-off" : r}
                    </button>
                  ))}
                </div>
                {repeat === "weekly" && (
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d, i) => (
                      <button key={d} type="button" onClick={() => setWeekdays((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i])}
                        className={cn("h-8 w-9 rounded-lg border text-[11px] font-bold", weekdays.includes(i) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                        {d}
                      </button>
                    ))}
                  </div>
                )}
                {repeat !== "none" && (
                  <div className="flex items-center gap-2">
                    <input value={repeatCount} onChange={(e) => setRepeatCount(e.target.value)} inputMode="numeric" className={cn(inputCls, "w-20")} />
                    <span className="text-xs text-muted-foreground">{repeat === "daily" ? "days from start" : "weeks from start"}</span>
                  </div>
                )}
                {previewCount > 1 && <p className="text-[11px] font-semibold text-primary">Creates {previewCount} departures.</p>}
              </div>
            </Field>
          )}

          <Button onClick={submit} disabled={saving} className="w-full rounded-xl font-bold">
            {saving ? "Saving…" : editingId ? "Save changes" : previewCount > 1 ? `Schedule ${previewCount} trips` : "Schedule trip"}
          </Button>
        </div>
      )}

      {trips.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No trips scheduled.</p>
      ) : trips.map((tp) => {
        const veh = vehicles.find((v) => v.id === tp.vehicle_id);
        const drv = drivers.find((d) => d.id === tp.driver_id);
        return (
        <div key={tp.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{routeLabel(tp.route_id)}</p>
            <p className="text-[11px] text-muted-foreground">
              {tp.depart_date} · {tp.depart_time}{tp.arrive_time ? `–${tp.arrive_time}` : ""} · {tp.bus_type} · ${dollars(tp.price_cents)} · {tp.total_seats} seats
            </p>
            {(veh || drv) && (
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                {veh && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5"><Truck className="h-3 w-3" />{veh.label}</span>}
                {drv && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5"><UserIcon className="h-3 w-3" />{drv.name}</span>}
              </p>
            )}
            {tp.amenities?.length > 0 && (
              <p className="mt-0.5 flex flex-wrap gap-1">
                {tp.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{busAmenityLabel(a)}</span>
                ))}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", tp.status === "scheduled" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
              {tp.status}
            </span>
            {tp.status === "scheduled" && (
              <>
                <button type="button" onClick={() => openNotify(tp)} className="text-[11px] font-bold text-primary">Notify</button>
                <button type="button" onClick={() => beginEdit(tp)} className="text-[11px] font-bold text-primary">Edit</button>
                <button type="button" onClick={() => cancel(tp)} className="text-[11px] font-bold text-rose-500">Cancel</button>
              </>
            )}
          </div>
          </div>

          {notifyId === tp.id && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <div className="flex flex-wrap gap-1.5">
                {([["reminder", "Reminder"], ["delay", "Delay"], ["cancel", "Cancellation"]] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => setNotifyMsg(presetMsg(tp, k))}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted">
                    {label}
                  </button>
                ))}
              </div>
              <textarea value={notifyMsg} onChange={(e) => setNotifyMsg(e.target.value)} rows={3} className={cn(inputCls, "resize-none")} placeholder="Message to passengers…" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => sendNotify(tp)} disabled={notifying} className="h-8 rounded-lg text-xs font-bold">{notifying ? "Sending…" : "Send to passengers"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setNotifyId(null); setNotifyMsg(""); }} className="h-8 rounded-lg text-xs font-bold">Cancel</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Sends an in-app notification to booked passengers with a ZIVO account.</p>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────── Fleet & Drivers ───────────────────────────────
function FleetTab({ storeId, vehicles, drivers, reload }: {
  storeId: string; vehicles: Vehicle[]; drivers: Driver[]; reload: () => Promise<void>;
}) {
  const [vLabel, setVLabel] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vType, setVType] = useState<string>(BUS_VEHICLE_TYPES[0].value);
  const [vSeats, setVSeats] = useState(String(BUS_VEHICLE_TYPES[0].defaultSeats));
  const [dName, setDName] = useState("");
  const [dPhone, setDPhone] = useState("");
  const [dLicense, setDLicense] = useState("");
  const [saving, setSaving] = useState(false);

  if (!storeId) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Select a bus business to manage its fleet.</p>;
  }

  const addVehicle = async () => {
    if (!vLabel.trim()) { toast.error("Name the vehicle (e.g. Coach 1)."); return; }
    setSaving(true);
    const vt = getBusVehicleType(vType);
    const { error } = await db.from("bus_vehicles").insert({
      store_id: storeId,
      label: vLabel.trim(),
      plate: vPlate.trim() || null,
      vehicle_type: vType,
      total_seats: Math.min(80, Math.max(1, Math.round(Number(vSeats) || vt?.defaultSeats || 40))),
      seat_layout: "2-2",
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error("Couldn't add vehicle."); return; }
    toast.success("Vehicle added.");
    setVLabel(""); setVPlate("");
    void reload();
  };

  const addDriver = async () => {
    if (!dName.trim()) { toast.error("Enter the driver's name."); return; }
    setSaving(true);
    const { error } = await db.from("bus_drivers").insert({
      store_id: storeId,
      name: dName.trim(),
      phone: dPhone.trim() || null,
      license_number: dLicense.trim() || null,
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error("Couldn't add driver."); return; }
    toast.success("Driver added.");
    setDName(""); setDPhone(""); setDLicense("");
    void reload();
  };

  const removeVehicle = async (id: string) => {
    const { error } = await db.from("bus_vehicles").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete vehicle."); return; }
    void reload();
  };
  const removeDriver = async (id: string) => {
    const { error } = await db.from("bus_drivers").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete driver."); return; }
    void reload();
  };

  return (
    <div className="space-y-5">
      {/* Vehicles */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground"><Truck className="h-4 w-4 text-primary" /> Vehicles</h3>
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><input value={vLabel} onChange={(e) => setVLabel(e.target.value)} className={inputCls} placeholder="Coach 1" /></Field>
            <Field label="Plate"><input value={vPlate} onChange={(e) => setVPlate(e.target.value)} className={inputCls} placeholder="2AB-1234" /></Field>
            <Field label="Type">
              <select value={vType} onChange={(e) => { setVType(e.target.value); const vt = getBusVehicleType(e.target.value); if (vt) setVSeats(String(vt.defaultSeats)); }} className={inputCls}>
                {BUS_VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Seats"><input value={vSeats} onChange={(e) => setVSeats(e.target.value)} inputMode="numeric" className={inputCls} /></Field>
          </div>
          <Button onClick={addVehicle} disabled={saving} className="w-full rounded-xl font-bold"><Plus className="mr-1 h-4 w-4" /> Add vehicle</Button>
        </div>
        {vehicles.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No vehicles yet.</p>
        ) : vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{v.label}{v.plate ? ` · ${v.plate}` : ""}</p>
              <p className="text-[11px] text-muted-foreground">{v.vehicle_type} · {v.total_seats} seats</p>
            </div>
            <button type="button" onClick={() => removeVehicle(v.id)} aria-label="Delete vehicle" className="rounded-lg p-2 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      {/* Drivers */}
      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-sm font-black text-foreground"><UserIcon className="h-4 w-4 text-primary" /> Drivers</h3>
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name"><input value={dName} onChange={(e) => setDName(e.target.value)} className={inputCls} placeholder="Sok Dara" /></Field>
            <Field label="Phone"><input value={dPhone} onChange={(e) => setDPhone(e.target.value)} inputMode="tel" className={inputCls} placeholder="012 345 678" /></Field>
            <Field label="License #"><input value={dLicense} onChange={(e) => setDLicense(e.target.value)} className={inputCls} placeholder="DL-009912" /></Field>
          </div>
          <Button onClick={addDriver} disabled={saving} className="w-full rounded-xl font-bold"><Plus className="mr-1 h-4 w-4" /> Add driver</Button>
        </div>
        {drivers.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No drivers yet.</p>
        ) : drivers.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
            <div>
              <p className="text-sm font-bold text-foreground">{d.name}</p>
              <p className="text-[11px] text-muted-foreground">{d.phone || "—"}{d.license_number ? ` · ${d.license_number}` : ""}</p>
            </div>
            <button type="button" onClick={() => removeDriver(d.id)} aria-label="Delete driver" className="rounded-lg p-2 text-muted-foreground hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────── Profile ───────────────────────────────
function ProfileTab({ store, onSaved }: { store?: BusStore; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(store?.name ?? "");
  const [description, setDescription] = useState(store?.description ?? "");
  const [phone, setPhone] = useState(store?.phone ?? "");
  const [address, setAddress] = useState(store?.address ?? "");
  const [logoUrl, setLogoUrl] = useState(store?.logo_url ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Re-sync when the selected store changes.
  useEffect(() => {
    setName(store?.name ?? "");
    setDescription(store?.description ?? "");
    setPhone(store?.phone ?? "");
    setAddress(store?.address ?? "");
    setLogoUrl(store?.logo_url ?? "");
  }, [store?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!store) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Select a bus business to edit its profile.</p>;
  }

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { publicUrl } = await uploadStoreAsset({ storeId: store.id, file, surface: "logo" });
      const { error } = await db.from("store_profiles").update({ logo_url: publicUrl }).eq("id", store.id);
      if (error) throw error;
      setLogoUrl(publicUrl);
      toast.success("Logo updated.");
      await onSaved();
    } catch (err: any) {
      toast.error(err?.message || "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Enter a business name."); return; }
    setSaving(true);
    const { error } = await db.from("store_profiles").update({
      name: name.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
    }).eq("id", store.id);
    setSaving(false);
    if (error) { toast.error("Couldn't save profile."); return; }
    toast.success("Profile saved.");
    void onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl ring-1 ring-border">
          {logoUrl ? (
            <img src={logoUrl} alt="" loading="eager" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary"><Bus className="h-7 w-7" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-foreground">{name || "Your bus service"}</p>
          <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-primary">
            <ImageIcon className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Change logo"}
            <input type="file" accept="image/*" className="hidden" onChange={onPickLogo} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
        <Field label="Business name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ekareach Express" /></Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={cn(inputCls, "resize-none")} placeholder="Daily coaches across Cambodia." />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Contact phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputCls} placeholder="012 345 678" /></Field>
          <Field label="Office address"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Phnom Penh" /></Field>
        </div>
        <Button onClick={save} disabled={saving} className="w-full rounded-xl font-bold">{saving ? "Saving…" : "Save profile"}</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────── Promotions ───────────────────────────────
function PromotionsTab({ storeId, promos, reload }: { storeId: string; promos: Promo[]; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [code, setCode] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [minFare, setMinFare] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [saving, setSaving] = useState(false);

  if (!storeId) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Select a bus business to manage promo codes.</p>;
  }

  const reset = () => {
    setCode(""); setDesc(""); setType("percent"); setValue(""); setMinFare(""); setMaxUses(""); setStartsOn(""); setEndsOn(""); setAdding(false);
  };

  const add = async () => {
    if (!code.trim()) { toast.error("Enter a promo code."); return; }
    const v = Math.round(Number(value) || 0);
    if (v <= 0) { toast.error("Enter a discount amount."); return; }
    if (type === "percent" && v > 100) { toast.error("Percent can't exceed 100."); return; }
    setSaving(true);
    const { error } = await db.from("bus_promos").insert({
      store_id: storeId,
      code: code.trim().toUpperCase(),
      description: desc.trim() || null,
      discount_type: type,
      discount_value: type === "fixed" ? toCents(value) : v,
      min_fare_cents: minFare ? toCents(minFare) : 0,
      max_uses: maxUses ? Math.max(1, Math.round(Number(maxUses))) : null,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      status: "active",
    });
    setSaving(false);
    if (error) { toast.error(error.message?.includes("duplicate") ? "That code already exists." : "Couldn't save promo."); return; }
    toast.success("Promo created.");
    reset();
    void reload();
  };

  const toggleStatus = async (p: Promo) => {
    const next = p.status === "active" ? "paused" : "active";
    const { error } = await db.from("bus_promos").update({ status: next }).eq("id", p.id);
    if (error) { toast.error("Couldn't update promo."); return; }
    void reload();
  };

  const remove = async (id: string) => {
    const { error } = await db.from("bus_promos").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete promo."); return; }
    void reload();
  };

  const discountLabel = (p: Promo) => p.discount_type === "fixed" ? `$${dollars(p.discount_value)} off` : `${p.discount_value}% off`;

  return (
    <div className="space-y-3">
      <Button onClick={() => (adding ? reset() : setAdding(true))} variant={adding ? "outline" : "default"} className="w-full rounded-2xl font-bold">
        <Plus className="mr-1 h-4 w-4" /> {adding ? "Cancel" : "New promo code"}
      </Button>

      {adding && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Code"><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="TET2026" /></Field>
            <Field label="Discount type">
              <select value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")} className={inputCls}>
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </Field>
            <Field label={type === "percent" ? "Percent off" : "Amount off ($)"}><input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" className={inputCls} placeholder={type === "percent" ? "10" : "2"} /></Field>
            <Field label="Min fare ($)"><input value={minFare} onChange={(e) => setMinFare(e.target.value)} inputMode="decimal" className={inputCls} placeholder="optional" /></Field>
            <Field label="Max uses"><input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" className={inputCls} placeholder="unlimited" /></Field>
            <Field label="Description"><input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="Khmer New Year" /></Field>
            <Field label="Starts"><input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={inputCls} /></Field>
            <Field label="Ends"><input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} className={inputCls} /></Field>
          </div>
          <Button onClick={add} disabled={saving} className="w-full rounded-xl font-bold">{saving ? "Saving…" : "Save promo"}</Button>
        </div>
      )}

      {promos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No promo codes yet.</p>
      ) : promos.map((p) => (
        <div key={p.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-primary/10 px-2 py-0.5 font-mono text-sm font-black tracking-wider text-primary">{p.code}</span>
              <span className="text-sm font-bold text-foreground">{discountLabel(p)}</span>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", p.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>{p.status}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {p.description ? `${p.description} · ` : ""}
            {p.min_fare_cents ? `min $${dollars(p.min_fare_cents)} · ` : ""}
            {p.max_uses != null ? `${p.used_count}/${p.max_uses} used` : `${p.used_count} used`}
            {p.ends_on ? ` · ends ${p.ends_on}` : ""}
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => toggleStatus(p)} className="h-8 rounded-lg text-xs font-bold">{p.status === "active" ? "Pause" : "Activate"}</Button>
            <Button size="sm" variant="outline" onClick={() => remove(p.id)} className="h-8 rounded-lg text-xs font-bold text-rose-500">Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────── Payments ───────────────────────────────
function PaymentsTab({ storeId }: { storeId: string }) {
  if (!storeId) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Select a bus business to set up payments.</p>;
  }
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-black text-foreground">Payment setup</h3>
        <p className="text-xs text-muted-foreground">Choose how riders pay for tickets — KHQR wallets (ABA, Wing, ACLEDA), cards, or cash on board.</p>
      </div>
      <StorePaymentSection storeId={storeId} />
    </div>
  );
}

// ─────────────────────────────── Bookings ───────────────────────────────
function BookingsTab({ bookings, reload, routeLabel, trips }: {
  bookings: Booking[]; reload: () => Promise<void>; routeLabel: (id: string) => string; trips: Trip[];
}) {
  const [view, setView] = useState<"list" | "manifest">("list");
  const tripById = useMemo(() => new Map(trips.map((t) => [t.id, t])), [trips]);
  const tripRoute = useMemo(() => {
    return (tripId: string) => routeLabel(tripById.get(tripId)?.route_id || "");
  }, [tripById, routeLabel]);

  // Manifest = active bookings (hold/confirmed) grouped by trip, sorted by
  // departure — the driver's boarding list for each upcoming departure.
  const manifest = useMemo(() => {
    const groups = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const arr = groups.get(b.trip_id) || [];
      arr.push(b);
      groups.set(b.trip_id, arr);
    }
    return [...groups.entries()]
      .map(([tripId, list]) => ({ trip: tripById.get(tripId), tripId, list }))
      .sort((a, b) => {
        const ka = a.trip ? `${a.trip.depart_date}${a.trip.depart_time}` : "";
        const kb = b.trip ? `${b.trip.depart_date}${b.trip.depart_time}` : "";
        return ka.localeCompare(kb);
      });
  }, [bookings, tripById]);

  // Confirm = capture the authorized card (if any) + mark confirmed. The edge
  // function also handles cash / no-card bookings. If it isn't deployed yet we
  // fall back to a plain status update so confirming always works; the booking
  // row's payment_status still shows whether the card was captured.
  const confirmBooking = async (id: string) => {
    const { error } = await supabase.functions.invoke("capture-bus-payment", { body: { booking_id: id } });
    if (!error) {
      toast.success("Booking confirmed.");
      void reload();
      return;
    }
    // A bare catch here used to send every failure to the direct write below,
    // so a deliberate refusal became a confirmation. capture-bus-payment
    // answers 409 "This payment was refunded and cannot be captured." — that
    // must reach the operator, not be overwritten with "Booking confirmed."
    if (!isEdgeFunctionMissing(error)) {
      toast.error(edgeFunctionErrorMessage(error, "Couldn't confirm booking."));
      void reload();
      return;
    }
    const { error: fallbackError } = await db.from("bus_bookings").update({ status: "confirmed" }).eq("id", id);
    if (fallbackError) { toast.error("Couldn't confirm booking."); return; }
    toast.success("Booking confirmed.");
    void reload();
  };

  // Cancel + refund. The edge function voids an uncaptured authorization or
  // refunds a captured charge, then marks the booking cancelled. Falls back to
  // a plain status update if the payment function isn't deployed yet.
  const cancelAndRefund = async (id: string) => {
    const { error } = await supabase.functions.invoke("capture-bus-payment", { body: { booking_id: id, action: "refund" } });
    if (!error) {
      toast.success("Booking cancelled & refunded.");
      void reload();
      return;
    }
    if (!isEdgeFunctionMissing(error)) {
      toast.error(edgeFunctionErrorMessage(error, "Couldn't cancel booking."));
      void reload();
      return;
    }
    // Only when the function is absent: cancel the seat locally, and say
    // plainly that no money moved. The old fallback toasted "Booking
    // cancelled." after a failed refund, which reads as money returned.
    const { error: fallbackError } = await db.from("bus_bookings").update({ status: "cancelled" }).eq("id", id);
    if (fallbackError) { toast.error("Couldn't cancel booking."); return; }
    toast.warning("Booking cancelled — refund NOT processed.", {
      description: "The payment function is not deployed. Refund this passenger in Stripe.",
    });
    void reload();
  };

  const toggleBoarded = async (b: Booking) => {
    const next = b.boarded_at ? null : new Date().toISOString();
    const { error } = await db.from("bus_bookings").update({ boarded_at: next }).eq("id", b.id);
    if (error) { toast.error("Couldn't update check-in."); return; }
    void reload();
  };

  if (bookings.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</p>;
  }

  const toggle = (
    <div className="flex gap-1 rounded-2xl bg-muted p-1">
      {(["list", "manifest"] as const).map((v) => (
        <button key={v} type="button" onClick={() => setView(v)}
          className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold capitalize transition-colors", view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
          {v === "manifest" ? <><ListChecks className="h-3.5 w-3.5" /> Manifest</> : <><Ticket className="h-3.5 w-3.5" /> All bookings</>}
        </button>
      ))}
    </div>
  );

  if (view === "manifest") {
    return (
      <div className="space-y-3">
        {toggle}
        {manifest.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active bookings to board.</p>
        ) : manifest.map(({ trip, tripId, list }) => {
          const seatsSold = list.reduce((n, b) => n + (b.passenger_count || (b.seats?.length ?? 0)), 0);
          const boardedCount = list.filter((b) => b.boarded_at).length;
          return (
            <div key={tripId} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{trip ? routeLabel(trip.route_id) : "Unknown trip"}</p>
                  <p className="text-[11px] text-muted-foreground">{trip ? `${trip.depart_date} · ${trip.depart_time}` : "—"}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-bold text-foreground">{seatsSold}{trip ? `/${trip.total_seats}` : ""} seats</p>
                  <p className="text-[10px] font-semibold text-emerald-600">{boardedCount}/{list.length} boarded</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {list.map((b) => {
                  const boarded = !!b.boarded_at;
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{b.contact_name || b.booking_ref || b.id.slice(0, 8)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Seats {(b.seats || []).join(", ") || "—"}{b.contact_phone ? ` · ${b.contact_phone}` : ""}
                        </p>
                      </div>
                      <button type="button" onClick={() => toggleBoarded(b)}
                        className={cn("flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors",
                          boarded ? "bg-emerald-500/15 text-emerald-600" : "border border-border text-muted-foreground hover:bg-muted")}>
                        <CheckCircle2 className={cn("h-3.5 w-3.5", !boarded && "opacity-40")} />
                        {boarded ? "Boarded" : "Check in"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {toggle}
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
              <Button size="sm" onClick={() => confirmBooking(b.id)} className="h-8 rounded-lg text-xs font-bold">Confirm</Button>
              <Button size="sm" variant="outline" onClick={() => cancelAndRefund(b.id)} className="h-8 rounded-lg text-xs font-bold">Cancel & refund</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────── Reviews ───────────────────────────────
function ReviewsTab({ reviews, reload, routeLabel, trips }: {
  reviews: Review[]; reload: () => Promise<void>; routeLabel: (id: string) => string; trips: Trip[];
}) {
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);

  const tripRoute = useMemo(() => {
    const m = new Map(trips.map((t) => [t.id, t.route_id]));
    return (tripId: string | null) => tripId ? routeLabel(m.get(tripId) || "") : "";
  }, [trips, routeLabel]);

  const published = reviews.filter((r) => r.status === "published");
  const avg = published.length ? published.reduce((n, r) => n + r.rating, 0) / published.length : 0;
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: published.filter((r) => r.rating === star).length }));

  const saveReply = async (id: string) => {
    if (!replyText.trim()) { toast.error("Write a reply."); return; }
    setSaving(true);
    const { error } = await db.from("bus_reviews").update({ reply: replyText.trim(), replied_at: new Date().toISOString() }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Couldn't post reply."); return; }
    toast.success("Reply posted.");
    setReplyFor(null); setReplyText("");
    void reload();
  };

  const Stars = ({ n }: { n: number }) => (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-3.5 w-3.5", i <= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
      ))}
    </span>
  );

  if (reviews.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No reviews yet. Riders can rate their trip after travelling.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-black leading-none text-foreground">{avg.toFixed(1)}</p>
            <Stars n={Math.round(avg)} />
            <p className="mt-1 text-[11px] text-muted-foreground">{published.length} review{published.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex-1 space-y-1">
            {dist.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-3 text-[10px] font-bold text-muted-foreground">{star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${published.length ? (count / published.length) * 100 : 0}%` }} />
                </div>
                <span className="w-5 text-right text-[10px] text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {reviews.map((r) => (
        <div key={r.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <Stars n={r.rating} />
            <span className="text-[10px] text-muted-foreground">{(r.created_at || "").slice(0, 10)}</span>
          </div>
          {r.trip_id && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{tripRoute(r.trip_id)}</p>}
          {r.comment && <p className="mt-1 text-sm text-foreground">{r.comment}</p>}

          {r.reply ? (
            <div className="mt-2 rounded-xl bg-muted/60 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Operator reply</p>
              <p className="mt-0.5 text-sm text-foreground">{r.reply}</p>
            </div>
          ) : replyFor === r.id ? (
            <div className="mt-2 space-y-2">
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2} className={cn(inputCls, "resize-none")} placeholder="Thank the rider or address their feedback…" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveReply(r.id)} disabled={saving} className="h-8 rounded-lg text-xs font-bold">{saving ? "Posting…" : "Post reply"}</Button>
                <Button size="sm" variant="outline" onClick={() => { setReplyFor(null); setReplyText(""); }} className="h-8 rounded-lg text-xs font-bold">Cancel</Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setReplyFor(r.id); setReplyText(""); }} className="mt-2 text-[11px] font-bold text-primary">Reply</button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────── Reports ───────────────────────────────
function ReportsTab({ routes, trips, bookings, routeLabel }: {
  routes: Route[]; trips: Trip[]; bookings: Booking[]; routeLabel: (id: string) => string;
}) {
  const tripRouteId = useMemo(() => new Map(trips.map((t) => [t.id, t.route_id])), [trips]);

  const earned = (b: Booking) => (b.payment_status === "captured" || b.status === "confirmed") ? (b.amount_cents || 0) : 0;
  const seatsOf = (b: Booking) => b.passenger_count || (b.seats?.length ?? 0);

  const revenueCents = bookings.reduce((n, b) => n + earned(b), 0);
  const seatsSold = bookings.filter((b) => b.status !== "cancelled").reduce((n, b) => n + seatsOf(b), 0);
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;

  // Average occupancy across scheduled trips (seats booked / capacity).
  const occupancy = useMemo(() => {
    const scheduled = trips.filter((t) => t.status === "scheduled" && t.total_seats > 0);
    if (scheduled.length === 0) return 0;
    const soldByTrip = new Map<string, number>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      soldByTrip.set(b.trip_id, (soldByTrip.get(b.trip_id) || 0) + seatsOf(b));
    }
    const ratios = scheduled.map((t) => Math.min(1, (soldByTrip.get(t.id) || 0) / t.total_seats));
    return Math.round((ratios.reduce((a, r) => a + r, 0) / ratios.length) * 100);
  }, [trips, bookings]);

  // Revenue by day for the last 14 days.
  const daily = useMemo(() => {
    const days: { date: string; cents: number }[] = [];
    for (let i = 13; i >= 0; i--) days.push({ date: addDays(todayISO(), -i), cents: 0 });
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const b of bookings) {
      const day = (b.created_at || "").slice(0, 10);
      const i = idx.get(day);
      if (i != null) days[i].cents += earned(b);
    }
    return days;
  }, [bookings]);
  const dailyMax = Math.max(1, ...daily.map((d) => d.cents));

  // Top routes by revenue.
  const topRoutes = useMemo(() => {
    const agg = new Map<string, { cents: number; seats: number }>();
    for (const b of bookings) {
      const rid = tripRouteId.get(b.trip_id);
      if (!rid) continue;
      const cur = agg.get(rid) || { cents: 0, seats: 0 };
      cur.cents += earned(b);
      if (b.status !== "cancelled") cur.seats += seatsOf(b);
      agg.set(rid, cur);
    }
    return [...agg.entries()]
      .map(([rid, v]) => ({ rid, ...v }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 5);
  }, [bookings, tripRouteId]);

  if (routes.length === 0 && trips.length === 0 && bookings.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No data yet — add routes and trips to see reports.</p>;
  }

  const stats = [
    { label: "Total revenue", value: `$${dollars(revenueCents)}`, tint: "bg-emerald-500/10 text-emerald-500", icon: DollarSign },
    { label: "Seats sold", value: String(seatsSold), tint: "bg-rose-500/10 text-rose-500", icon: Users },
    { label: "Confirmed", value: String(confirmed), tint: "bg-sky-500/10 text-sky-500", icon: Ticket },
    { label: "Avg occupancy", value: `${occupancy}%`, tint: "bg-violet-500/10 text-violet-500", icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className={cn("mb-2 flex h-9 w-9 items-center justify-center rounded-xl", s.tint)}><s.icon className="h-4 w-4" /></div>
            <p className="text-2xl font-black leading-none text-foreground">{s.value}</p>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-black text-foreground"><BarChart3 className="h-4 w-4 text-primary" /> Revenue · last 14 days</h3>
        <div className="flex h-32 items-end gap-1">
          {daily.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: $${dollars(d.cents)}`}>
              <div className="flex w-full items-end" style={{ height: "100%" }}>
                <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(2, (d.cents / dailyMax) * 100)}%` }} />
              </div>
              <span className="text-[8px] text-muted-foreground">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-black text-foreground"><MapPin className="h-4 w-4 text-primary" /> Top routes</h3>
        {topRoutes.length === 0 ? (
          <p className="py-3 text-center text-sm text-muted-foreground">No revenue yet.</p>
        ) : (
          <div className="space-y-2">
            {topRoutes.map((r) => (
              <div key={r.rid} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{routeLabel(r.rid)}</p>
                  <p className="text-[11px] text-muted-foreground">{r.seats} seat(s) sold</p>
                </div>
                <span className="shrink-0 text-sm font-black text-foreground">${dollars(r.cents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
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
