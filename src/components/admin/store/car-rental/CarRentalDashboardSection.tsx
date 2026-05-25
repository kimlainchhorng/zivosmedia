/**
 * CarRentalDashboardSection — at-a-glance landing for the car-rental admin.
 * Pulls today's reservations + fleet stats from existing tables.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Car, CalendarRange, DollarSign, KeyRound, ClipboardCheck,
  ArrowRight, Loader2, Building2, Users, Printer, Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { buildIcsFile, downloadIcs, type IcalReservation } from "@/lib/car-rental/ical";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCarRentalReservations } from "@/hooks/car-rental/useCarRentalReservations";
import { useCarRentalVehicles } from "@/hooks/car-rental/useCarRentalVehicles";
import { useCarRentalCustomers } from "@/hooks/car-rental/useCarRentalCustomers";
import { useCarRentalLocations } from "@/hooks/car-rental/useCarRentalLocations";
import { useCarRentalAddons } from "@/hooks/car-rental/useCarRentalAddons";
import { supabase } from "@/integrations/supabase/client";
import CarRentalOnboardingChecklist from "./CarRentalOnboardingChecklist";
import CarRentalActivityFeed from "./CarRentalActivityFeed";
import CarRentalSparklineRow from "./CarRentalSparklineRow";

interface Props {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function CarRentalDashboardSection({ storeId, onJumpToTab }: Props) {
  const today = todayIso();
  const { reservations: todayReservations, loading } = useCarRentalReservations({ storeId, date: today });
  const { vehicles } = useCarRentalVehicles(storeId);
  const { customers } = useCarRentalCustomers(storeId);
  const { locations } = useCarRentalLocations(storeId);
  const { addons } = useCarRentalAddons(storeId);
  const [storeSlug, setStoreSlug] = useState<string | undefined>(undefined);
  const [hasAnyReservation, setHasAnyReservation] = useState(false);

  // Active rentals (picked_up status, regardless of pickup date).
  const [activeRentals, setActiveRentals] = useState<number>(0);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("car_rental_reservations")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "picked_up");
      if (cancelled) return;
      setActiveRentals(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [storeId, todayReservations]);

  const stats = useMemo(() => {
    const now = Date.now();
    let pickupsToday = 0, returnsToday = 0, revenueCents = 0;
    const upcomingPickups: typeof todayReservations = [];
    for (const r of todayReservations) {
      const pickupTs = new Date(r.pickup_at).getTime();
      const dropoffTs = new Date(r.dropoff_at).getTime();
      const isToday = (ts: number) => {
        const d = new Date(ts);
        return d.toDateString() === new Date().toDateString();
      };
      if (isToday(pickupTs) && r.status !== "cancelled" && r.status !== "no_show") pickupsToday++;
      if (isToday(dropoffTs) && (r.status === "picked_up" || r.status === "returned")) returnsToday++;
      if (r.status === "returned" || r.status === "picked_up") {
        revenueCents += r.total_cents;
      }
      if ((r.status === "confirmed" || r.status === "pending") && pickupTs > now) {
        upcomingPickups.push(r);
      }
    }
    upcomingPickups.sort((a, b) => a.pickup_at.localeCompare(b.pickup_at));
    return {
      pickupsToday,
      returnsToday,
      revenueCents,
      upcomingPickups: upcomingPickups.slice(0, 5),
    };
  }, [todayReservations]);

  const fleetStats = useMemo(() => {
    const available = vehicles.filter((v) => v.is_active && v.status === "available").length;
    const rented = vehicles.filter((v) => v.is_active && v.status === "rented").length;
    const maintenance = vehicles.filter((v) => v.is_active && v.status === "maintenance").length;
    const total = vehicles.filter((v) => v.is_active).length;
    const utilization = total > 0 ? Math.round((rented / total) * 100) : 0;
    return { available, rented, maintenance, total, utilization };
  }, [vehicles]);

  const setupReady = vehicles.length > 0 && locations.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [slugRow, anyRes] = await Promise.all([
        supabase.from("store_profiles").select("slug").eq("id", storeId).maybeSingle(),
        supabase.from("car_rental_reservations").select("id", { head: true, count: "exact" }).eq("store_id", storeId),
      ]);
      if (cancelled) return;
      setStoreSlug((slugRow.data as any)?.slug);
      setHasAnyReservation((anyRes.count ?? 0) > 0);
    })();
    return () => { cancelled = true; };
  }, [storeId, todayReservations.length]);

  return (
    <div className="space-y-4">
      <CarRentalOnboardingChecklist
        storeId={storeId}
        storeSlug={storeSlug ?? undefined}
        hasLocation={locations.length > 0}
        hasVehicle={vehicles.length > 0}
        hasAddon={addons.length > 0}
        hasReservation={hasAnyReservation}
        onJumpToTab={onJumpToTab}
      />

      {!setupReady && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-900 dark:text-amber-200">
              <Car className="h-5 w-5" /> Finish your setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground/80">
              Add at least one pickup location and one vehicle before you can take reservations.
            </p>
            <div className="flex flex-wrap gap-2">
              {vehicles.length === 0 && onJumpToTab && (
                <Button size="sm" onClick={() => onJumpToTab("car-rental-fleet")}>Add a vehicle</Button>
              )}
              {locations.length === 0 && onJumpToTab && (
                <Button size="sm" variant="outline" onClick={() => onJumpToTab("car-rental-locations")}>Add a location</Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend sparklines for the last 14 days */}
      <CarRentalSparklineRow storeId={storeId} />

      {/* Top stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={KeyRound} label="Pickups today" value={String(stats.pickupsToday)}
          sub={stats.returnsToday > 0 ? `${stats.returnsToday} returns due` : "No returns today"} />
        <StatCard icon={Car} label="On the road" value={String(activeRentals)}
          sub={`${fleetStats.available} available · ${fleetStats.utilization}% util.`} />
        <StatCard icon={DollarSign} label="Revenue today" value={formatPrice(stats.revenueCents)}
          sub="From rentals checked out today" />
        <StatCard icon={Users} label="Renters in book" value={String(customers.length)}
          sub={`${fleetStats.total} vehicles · ${locations.length} location${locations.length === 1 ? "" : "s"}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-5 w-5 text-primary" />
              Upcoming pickups today
            </CardTitle>
            {onJumpToTab && (
              <Button variant="ghost" size="sm" onClick={() => onJumpToTab("car-rental-reservations")} className="gap-1.5">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : stats.upcomingPickups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No more pickups scheduled for today.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {stats.upcomingPickups.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                      {formatTime(r.pickup_at).replace(" ", "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.vehicle_label} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{formatPrice(r.total_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Quick jump
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {onJumpToTab && [
              { id: "car-rental-reservations", label: "Reservations" },
              { id: "car-rental-fleet", label: "Fleet" },
              { id: "car-rental-rates", label: "Rates" },
              { id: "car-rental-customers", label: "Renters" },
              { id: "car-rental-locations", label: "Locations" },
              { id: "car-rental-reports", label: "Reports" },
            ].map((t) => (
              <Button key={t.id} variant="outline" size="sm" onClick={() => onJumpToTab(t.id)}>
                {t.label}
              </Button>
            ))}
            <Button asChild variant="outline" size="sm" className="col-span-2">
              <Link to={`/admin/stores/${storeId}/car-rental-daily-sheet`}>
                <Printer className="mr-1 h-3.5 w-3.5" /> Print today's pickup/return sheet
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="col-span-2" onClick={async () => {
              const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
              const { data } = await supabase
                .from("car_rental_reservations")
                .select("id, confirmation_code, vehicle_label, customer_name, customer_phone, customer_email, pickup_location_name, pickup_at, dropoff_at, status, total_cents, rental_days, internal_notes, customer_notes")
                .eq("store_id", storeId)
                .gte("pickup_at", since)
                .order("pickup_at", { ascending: true });
              const rows = (data ?? []) as unknown as IcalReservation[];
              if (rows.length === 0) {
                toast.info("No reservations to export yet");
                return;
              }
              const ics = buildIcsFile({ calendarName: "Car Rentals", reservations: rows });
              downloadIcs(`car-rentals-${new Date().toISOString().slice(0, 10)}.ics`, ics);
              toast.success(`Exported ${rows.length} reservation${rows.length === 1 ? "" : "s"}`);
            }}>
              <Download className="mr-1 h-3.5 w-3.5" /> Export to calendar (.ics)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Car className="h-5 w-5 text-primary" /> Fleet at a glance
          </CardTitle>
          <span className="text-[11px] text-muted-foreground">
            {fleetStats.total} active vehicle{fleetStats.total === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FleetPill label="Available" value={fleetStats.available} tone="ok" />
          <FleetPill label="Rented" value={fleetStats.rented} tone="primary" />
          <FleetPill label="Maintenance" value={fleetStats.maintenance} tone="warn" />
          <FleetPill label="Utilization" value={`${fleetStats.utilization}%`} tone="neutral" />
        </CardContent>
      </Card>

      <CarRentalActivityFeed storeId={storeId} onJumpToTab={onJumpToTab} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "neutral" }: {
  icon: typeof Car; label: string; value: string; sub?: string; tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-4",
      tone === "warn" && "border-amber-500/30 bg-amber-500/5"
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FleetPill({ label, value, tone }: { label: string; value: number | string; tone: "ok" | "warn" | "primary" | "neutral" }) {
  return (
    <div className={cn(
      "rounded-xl border p-3 text-center",
      tone === "ok" && "border-emerald-500/30 bg-emerald-500/5",
      tone === "warn" && "border-amber-500/30 bg-amber-500/5",
      tone === "primary" && "border-primary/30 bg-primary/5",
      tone === "neutral" && "border-border",
    )}>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

// Suppress unused-import warning for Building2 (kept for future map widget).
void Building2;
