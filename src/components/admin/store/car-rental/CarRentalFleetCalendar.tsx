/**
 * CarRentalFleetCalendar — Gantt-style multi-day view.
 *
 * Rows are vehicles, columns are days. Reservations render as bars across the
 * grid so an operator can see fleet occupancy at a glance.
 */
import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Car,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCarRentalVehicles } from "@/hooks/car-rental/useCarRentalVehicles";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

interface Reservation {
  id: string;
  vehicle_id: string | null;
  customer_name: string;
  pickup_at: string;
  dropoff_at: string;
  status: string;
  total_cents: number;
  confirmation_code: string;
}

const DAYS_PER_VIEW = 14;
const dayMs = 24 * 60 * 60 * 1000;

const todayIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
};
const addDays = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * dayMs).toISOString();
const formatDayLabel = (iso: string) => {
  const d = new Date(iso);
  return { dow: d.toLocaleDateString(undefined, { weekday: "short" }), day: d.getDate() };
};
const isWeekend = (iso: string) => {
  const day = new Date(iso).getDay();
  return day === 0 || day === 6;
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CarRentalFleetCalendar({ storeId }: Props) {
  const [startIso, setStartIso] = useState(todayIso());
  const { vehicles, loading: vehiclesLoading } = useCarRentalVehicles(storeId);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < DAYS_PER_VIEW; i++) out.push(addDays(startIso, i));
    return out;
  }, [startIso]);

  const rangeFrom = startIso;
  const rangeTo = addDays(startIso, DAYS_PER_VIEW);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("car_rental_reservations")
        .select("id, vehicle_id, customer_name, pickup_at, dropoff_at, status, total_cents, confirmation_code")
        .eq("store_id", storeId)
        .in("status", ["pending", "confirmed", "picked_up", "returned"])
        .lt("pickup_at", rangeTo)
        .gt("dropoff_at", rangeFrom);
      if (cancelled) return;
      if (err) {
        setError("Couldn't load reservations.");
        setLoading(false);
        return;
      }
      setReservations((data ?? []) as unknown as Reservation[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, rangeFrom, rangeTo]);

  useEffect(() => {
    const channel = supabase
      .channel(`car-rental-calendar:${storeId}:${rangeFrom}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` },
        () => {
          // Trigger reload by bumping a state — easiest path is to call the same effect.
          // Use a setStartIso(startIso) ping; but that's identity, so we go via setLoading.
          void (async () => {
            const { data } = await supabase
              .from("car_rental_reservations")
              .select("id, vehicle_id, customer_name, pickup_at, dropoff_at, status, total_cents, confirmation_code")
              .eq("store_id", storeId)
              .in("status", ["pending", "confirmed", "picked_up", "returned"])
              .lt("pickup_at", rangeTo)
              .gt("dropoff_at", rangeFrom);
            setReservations((data ?? []) as unknown as Reservation[]);
          })();
        })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, rangeFrom, rangeTo]);

  const reservationsByVehicle = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      if (!r.vehicle_id) continue;
      const list = map.get(r.vehicle_id) ?? [];
      list.push(r);
      map.set(r.vehicle_id, list);
    }
    return map;
  }, [reservations]);

  const occupancy = useMemo(() => {
    if (vehicles.length === 0) return [] as number[];
    const occ = new Array(DAYS_PER_VIEW).fill(0);
    for (const r of reservations) {
      if (r.status === "cancelled" || r.status === "no_show") continue;
      const pickup = new Date(r.pickup_at).getTime();
      const dropoff = new Date(r.dropoff_at).getTime();
      for (let i = 0; i < DAYS_PER_VIEW; i++) {
        const dayStart = new Date(days[i]).getTime();
        const dayEnd = dayStart + dayMs;
        if (pickup < dayEnd && dropoff > dayStart) occ[i]++;
      }
    }
    return occ.map((c) => Math.min(100, Math.round((c / vehicles.length) * 100)));
  }, [reservations, vehicles.length, days]);

  const start = new Date(startIso);
  const end = new Date(addDays(startIso, DAYS_PER_VIEW - 1));
  const periodLabel = `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-5 w-5 text-primary" /> Fleet calendar
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setStartIso(addDays(startIso, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStartIso(todayIso())}>This week</Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setStartIso(addDays(startIso, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        )}

        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{periodLabel}</p>

        {(loading || vehiclesLoading) ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
            Add vehicles to see fleet availability here.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <div className="min-w-[860px]">
              {/* Header row */}
              <div className="grid sticky top-0 z-10 bg-card border-b border-border" style={{ gridTemplateColumns: `200px repeat(${DAYS_PER_VIEW}, minmax(0, 1fr))` }}>
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border">Vehicle</div>
                {days.map((d) => {
                  const { dow, day } = formatDayLabel(d);
                  const today = isSameDay(new Date(d), new Date());
                  const weekend = isWeekend(d);
                  const occPct = occupancy[days.indexOf(d)] ?? 0;
                  return (
                    <div key={d} className={cn(
                      "px-1 py-2 text-center border-r border-border last:border-r-0",
                      weekend && "bg-muted/30",
                      today && "bg-primary/8"
                    )}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dow}</p>
                      <p className={cn("text-sm font-bold", today ? "text-primary" : "text-foreground")}>{day}</p>
                      <div className="mx-auto mt-0.5 h-0.5 w-6 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary/60" style={{ width: `${occPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Vehicle rows */}
              {vehicles.filter((v) => v.is_active).map((v) => (
                <VehicleRow
                  key={v.id}
                  label={`${v.year ? `${v.year} ` : ""}${v.make} ${v.model}`}
                  category={v.category}
                  vehicleStatus={v.status}
                  reservations={reservationsByVehicle.get(v.id) ?? []}
                  days={days}
                />
              ))}
            </div>
            <div className="border-t border-border bg-muted/20 p-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              <Legend tone="primary" label="Confirmed / pending" />
              <Legend tone="emerald" label="On rental" />
              <Legend tone="emerald-faded" label="Returned" />
              <Legend tone="muted" label="Maintenance" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VehicleRow({
  label, category, vehicleStatus, reservations, days,
}: {
  label: string;
  category: string;
  vehicleStatus: string;
  reservations: Reservation[];
  days: string[];
}) {
  const periodStart = new Date(days[0]).getTime();
  const periodEnd = new Date(days[days.length - 1]).getTime() + dayMs;
  const periodSpan = periodEnd - periodStart;

  return (
    <div
      className="relative grid border-b border-border last:border-b-0"
      style={{ gridTemplateColumns: `200px repeat(${days.length}, minmax(0, 1fr))` }}
    >
      <div className="px-3 py-3 border-r border-border bg-card">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground capitalize">
          {category}{vehicleStatus === "maintenance" ? " · in maintenance" : ""}
        </p>
      </div>
      {/* Day cells (background) */}
      {days.map((d) => (
        <div key={d} className={cn(
          "border-r border-border/60 last:border-r-0 h-16",
          isWeekend(d) && "bg-muted/30",
          isSameDay(new Date(d), new Date()) && "bg-primary/5",
          vehicleStatus === "maintenance" && "bg-muted/40",
        )} />
      ))}
      {/* Reservation bars overlay */}
      <div className="pointer-events-none absolute inset-0" style={{ left: 200 }}>
        <div className="relative h-full">
          {reservations.map((r) => {
            const start = Math.max(new Date(r.pickup_at).getTime(), periodStart);
            const end = Math.min(new Date(r.dropoff_at).getTime(), periodEnd);
            if (end <= start) return null;
            const leftPct = ((start - periodStart) / periodSpan) * 100;
            const widthPct = ((end - start) / periodSpan) * 100;
            const tone =
              r.status === "picked_up" ? "bg-emerald-500/85 text-white border-emerald-600"
              : r.status === "returned" ? "bg-emerald-500/40 text-emerald-900 dark:text-emerald-100 border-emerald-500/60"
              : r.status === "pending" ? "bg-amber-500/85 text-white border-amber-600"
              : "bg-primary/85 text-primary-foreground border-primary";
            return (
              <div
                key={r.id}
                className={cn(
                  "pointer-events-auto absolute top-1.5 bottom-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold truncate flex items-center cursor-default",
                  tone,
                )}
                style={{ left: `${leftPct}%`, width: `${Math.max(2, widthPct)}%` }}
                title={`${r.customer_name} · ${r.confirmation_code} · ${new Date(r.pickup_at).toLocaleDateString()} – ${new Date(r.dropoff_at).toLocaleDateString()}`}
              >
                <span className="truncate">{r.customer_name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: "primary" | "emerald" | "emerald-faded" | "muted"; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(
        "inline-block h-2 w-3 rounded-sm border",
        tone === "primary" && "bg-primary/85 border-primary",
        tone === "emerald" && "bg-emerald-500/85 border-emerald-600",
        tone === "emerald-faded" && "bg-emerald-500/40 border-emerald-500/60",
        tone === "muted" && "bg-muted border-border",
      )} />
      {label}
    </span>
  );
}
