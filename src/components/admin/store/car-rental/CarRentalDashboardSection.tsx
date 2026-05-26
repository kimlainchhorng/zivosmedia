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
import { buildReservationsCsv, downloadCsv, type CsvReservation } from "@/lib/car-rental/csv";
import { useStoreCurrency } from "@/lib/car-rental/money";
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
import CarRentalComplianceAlerts from "./CarRentalComplianceAlerts";
import CarRentalSettingsCard from "./CarRentalSettingsCard";
import CarRentalUpcomingWidget from "./CarRentalUpcomingWidget";
import CarRentalSeedDemoButton from "./CarRentalSeedDemoButton";
import { carRentalSoundStorageKey } from "@/hooks/car-rental/useCarRentalRealtimeNotifications";
import { Bell, BellOff } from "lucide-react";

interface Props {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function CarRentalDashboardSection({ storeId, onJumpToTab }: Props) {
  const today = todayIso();
  const { reservations: todayReservations, loading } = useCarRentalReservations({ storeId, date: today });
  const { vehicles } = useCarRentalVehicles(storeId);
  const { customers } = useCarRentalCustomers(storeId);
  const { locations } = useCarRentalLocations(storeId);
  const { addons } = useCarRentalAddons(storeId);
  const { format: formatPrice } = useStoreCurrency(storeId);
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

  // Sound-on-new-booking preference (per store, persisted in localStorage).
  const soundKey = carRentalSoundStorageKey(storeId);
  const [soundOn, setSoundOn] = useState(false);
  useEffect(() => {
    try { setSoundOn(localStorage.getItem(soundKey) === "1"); } catch { /* */ }
  }, [soundKey]);
  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(soundKey, next ? "1" : "0");
      } catch { /* */ }
      toast.success(next ? "Sound on" : "Sound off", {
        description: next ? "You'll hear a chime when an online booking arrives." : "Toast notifications only.",
      });
      return next;
    });
  };

  // Forward revenue: sum of total_cents for confirmed + picked_up reservations
  // whose pickup_at falls in the next 30 days. "Confirmed forward booking value".
  const [forward, setForward] = useState<{ next7: number; next30: number; count30: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data } = await supabase
        .from("car_rental_reservations")
        .select("total_cents, pickup_at, status")
        .eq("store_id", storeId)
        .in("status", ["confirmed", "picked_up"])
        .gte("pickup_at", now.toISOString())
        .lt("pickup_at", in30.toISOString())
        .limit(500);
      if (cancelled) return;
      let next30 = 0;
      let next7 = 0;
      let count30 = 0;
      for (const r of (data ?? []) as Array<{ total_cents: number; pickup_at: string }>) {
        const pickup = new Date(r.pickup_at);
        next30 += r.total_cents;
        count30++;
        if (pickup < in7) next7 += r.total_cents;
      }
      setForward({ next7, next30, count30 });
    })();
    return () => { cancelled = true; };
  }, [storeId, todayReservations.length]);

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

      <CarRentalSeedDemoButton
        storeId={storeId}
        hasLocation={locations.length > 0}
        hasVehicle={vehicles.length > 0}
        hasAddon={addons.length > 0}
        onSeeded={() => window.location.reload()}
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

      <CarRentalComplianceAlerts storeId={storeId} onJumpToTab={onJumpToTab} />

      <CarRentalUpcomingWidget storeId={storeId} onJumpToTab={onJumpToTab} />

      {/* Trend sparklines for the last 14 days */}
      <CarRentalSparklineRow storeId={storeId} />

      {/* Today's snapshot — copyable plain-text summary for sharing in Slack/SMS. */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-[12px]">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          <span className="font-bold uppercase tracking-wider text-[10px] text-foreground/80">Today</span>
          <span><span className="font-semibold text-foreground">{stats.pickupsToday}</span> pickups</span>
          <span><span className="font-semibold text-foreground">{stats.returnsToday}</span> returns</span>
          <span><span className="font-semibold text-foreground">{activeRentals}</span> on the road</span>
          <span><span className="font-semibold text-foreground">{formatPrice(stats.revenueCents)}</span> revenue</span>
          {forward && <span><span className="font-semibold text-foreground">{forward.count30}</span> upcoming 30d</span>}
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            title={soundOn ? "Mute new-booking chime" : "Play a chime on new online bookings"}
            onClick={toggleSound}
          >
            {soundOn
              ? <><Bell className="mr-1 h-3.5 w-3.5 text-primary" /> Sound on</>
              : <><BellOff className="mr-1 h-3.5 w-3.5" /> Sound off</>}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => {
              const dateStr = new Date().toLocaleDateString();
              const upcomingLines = stats.upcomingPickups.slice(0, 3).map((p) =>
                `  • ${formatTime(p.pickup_at)} — ${p.customer_name} · ${p.vehicle_label}`,
              );
              const txt = [
                `📋 Car rental snapshot — ${dateStr}`,
                `Pickups today: ${stats.pickupsToday}${stats.returnsToday > 0 ? ` · Returns due: ${stats.returnsToday}` : ""}`,
                `On the road: ${activeRentals}${fleetStats.total > 0 ? ` · Fleet utilization: ${fleetStats.utilization}%` : ""}`,
                `Revenue today: ${formatPrice(stats.revenueCents)}`,
                forward && forward.count30 > 0
                  ? `Upcoming 30d: ${forward.count30} bookings · ${formatPrice(forward.next30)} forward revenue`
                  : null,
                upcomingLines.length > 0 ? "" : null,
                upcomingLines.length > 0 ? "Next pickups:" : null,
                ...upcomingLines,
              ].filter((s): s is string => typeof s === "string").join("\n");
              void navigator.clipboard.writeText(txt);
              toast.success("Snapshot copied", { description: "Paste into Slack, SMS, or email." });
            }}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Copy snapshot
          </Button>
        </div>
      </div>

      {/* Top stat row — most cards are click-to-jump for fast drill-down. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={KeyRound} label="Pickups today" value={String(stats.pickupsToday)}
          sub={stats.returnsToday > 0 ? `${stats.returnsToday} returns due` : "No returns today"}
          onClick={onJumpToTab ? () => onJumpToTab("car-rental-checkout") : undefined} />
        <StatCard icon={Car} label="On the road" value={String(activeRentals)}
          sub={`${fleetStats.available} available · ${fleetStats.utilization}% util.`}
          onClick={onJumpToTab ? () => onJumpToTab("car-rental-returns") : undefined} />
        <StatCard icon={DollarSign} label="Revenue today" value={formatPrice(stats.revenueCents)}
          sub="From rentals checked out today"
          onClick={onJumpToTab ? () => onJumpToTab("car-rental-income") : undefined} />
        <StatCard
          icon={CalendarRange}
          label="Forward 30d"
          value={forward ? formatPrice(forward.next30) : "—"}
          sub={forward ? `${forward.count30} confirmed · ${formatPrice(forward.next7)} next 7d` : "Loading…"}
          tone={forward && forward.next30 > 0 ? "ok" : "neutral"}
          onClick={onJumpToTab ? () => onJumpToTab("car-rental-reservations") : undefined}
        />
        <StatCard icon={Users} label="Renters in book" value={String(customers.length)}
          sub={`${fleetStats.total} vehicles · ${locations.length} location${locations.length === 1 ? "" : "s"}`}
          onClick={onJumpToTab ? () => onJumpToTab("car-rental-customers") : undefined} />
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
            <Button variant="outline" size="sm" onClick={async () => {
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
              toast.success(`Exported ${rows.length} to .ics`);
            }}>
              <Download className="mr-1 h-3.5 w-3.5" /> Calendar (.ics)
            </Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const { data } = await supabase
                .from("car_rental_reservations")
                .select("confirmation_code, customer_name, customer_phone, customer_email, vehicle_label, vehicle_category, pickup_at, dropoff_at, pickup_location_name, dropoff_location_name, rental_days, daily_rate_cents, base_total_cents, addons_total_cents, fees_cents, taxes_cents, discount_cents, security_deposit_cents, total_cents, amount_paid_cents, status, source, cancellation_reason, created_at")
                .eq("store_id", storeId)
                .order("pickup_at", { ascending: false });
              const rows = (data ?? []) as unknown as CsvReservation[];
              if (rows.length === 0) {
                toast.info("No reservations to export yet");
                return;
              }
              const csv = buildReservationsCsv(rows);
              downloadCsv(`car-rentals-${new Date().toISOString().slice(0, 10)}.csv`, csv);
              toast.success(`Exported ${rows.length} to CSV`);
            }}>
              <Download className="mr-1 h-3.5 w-3.5" /> CSV (.csv)
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

      <CarRentalSettingsCard storeId={storeId} />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone = "neutral", onClick }: {
  icon: typeof Car; label: string; value: string; sub?: string; tone?: "ok" | "warn" | "neutral";
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  const Tag: "button" | "div" = interactive ? "button" : "div";
  return (
    <Tag
      {...(interactive ? { type: "button" as const, onClick } : {})}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 text-left w-full transition-colors",
        tone === "warn" && "border-amber-500/30 bg-amber-500/5",
        interactive && "hover:border-primary/40 hover:bg-primary/5 cursor-pointer",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </Tag>
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
