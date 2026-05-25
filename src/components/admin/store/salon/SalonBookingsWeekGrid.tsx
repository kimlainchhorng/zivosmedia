/**
 * SalonBookingsWeekGrid — 7-day overview of bookings. Each day column lists
 * its bookings sorted by start time as compact chips, color-coded by status.
 * Less detailed than the day grid but lets owners scan a whole week at once.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { SalonBooking, SalonBookingStatus } from "@/hooks/salon/useSalonBookings";

const STATUS_TONE: Record<SalonBookingStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  confirmed: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  cancelled: "border-border bg-muted text-muted-foreground line-through opacity-60",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const startOfWeekIso = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
};

const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const formatDayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

interface SalonBookingsWeekGridProps {
  storeId: string;
  /** Any date in the week to display — will snap to that week's Sunday. */
  date: string;
  onJumpToDay?: (iso: string) => void;
  onClickBooking?: (b: SalonBooking) => void;
}

export default function SalonBookingsWeekGrid({ storeId, date, onJumpToDay, onClickBooking }: SalonBookingsWeekGridProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeekIso(date));
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWeekStart(startOfWeekIso(date));
  }, [date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const start = new Date(`${weekStart}T00:00:00`).toISOString();
      const end = new Date(`${shiftDay(weekStart, 7)}T00:00:00`).toISOString();
      const { data, error: err } = await supabase
        .from("salon_bookings")
        .select("*")
        .eq("store_id", storeId)
        .gte("start_at", start).lt("start_at", end)
        .order("start_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      if (err) {
        console.error("[SalonBookingsWeekGrid] load failed", err);
        setError("Couldn't load the week.");
        setLoading(false);
        return;
      }
      setBookings((data ?? []) as unknown as SalonBooking[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, weekStart]);

  const columns = useMemo(() => {
    const m: Record<string, SalonBooking[]> = {};
    for (let i = 0; i < 7; i++) {
      const dayIso = shiftDay(weekStart, i);
      m[dayIso] = [];
    }
    for (const b of bookings) {
      // Use LOCAL date — start_at.slice(0, 10) would return the UTC date,
      // which lands evening bookings in the next day's column for any
      // negative-UTC-offset timezone.
      const d = new Date(b.start_at);
      const dayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (m[dayIso]) m[dayIso].push(b);
    }
    return m;
  }, [bookings, weekStart]);

  const weekEnd = shiftDay(weekStart, 6);
  const todayKey = todayIso();
  const startD = new Date(`${weekStart}T12:00:00`);
  const endD = new Date(`${weekEnd}T12:00:00`);
  const sameMonth = startD.getMonth() === endD.getMonth();
  const rangeLabel = sameMonth
    ? `${startD.toLocaleString(undefined, { month: "short" })} ${startD.getDate()}–${endD.getDate()}, ${endD.getFullYear()}`
    : `${startD.toLocaleString(undefined, { month: "short", day: "numeric" })} – ${endD.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekStart(shiftDay(weekStart, -7))} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">{rangeLabel}</span>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setWeekStart(shiftDay(weekStart, 7))} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-9" onClick={() => setWeekStart(startOfWeekIso(todayIso()))}>
          This week
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => shiftDay(weekStart, i)).map((dayIso, i) => {
              const isToday = dayIso === todayKey;
              const dayBookings = columns[dayIso] ?? [];
              return (
                <div
                  key={dayIso}
                  className={cn(
                    "rounded-xl border bg-card p-2",
                    isToday ? "border-primary/40 bg-primary/5" : "border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onJumpToDay?.(dayIso)}
                    className="mb-2 block w-full text-center hover:bg-muted/40 rounded-md py-1 transition-colors"
                  >
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", isToday ? "text-primary" : "text-muted-foreground")}>
                      {DAY_LABELS[i]}
                    </p>
                    <p className={cn("text-sm font-semibold", isToday ? "text-foreground" : "text-foreground/85")}>
                      {formatDayLabel(dayIso)}
                    </p>
                  </button>
                  {dayBookings.length === 0 ? (
                    <p className="text-center text-[10px] text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-1">
                      {dayBookings.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => onClickBooking?.(b)}
                            className={cn(
                              "block w-full rounded-md border px-1.5 py-1 text-left text-[10px] leading-tight transition-transform hover:scale-[1.02]",
                              STATUS_TONE[b.status],
                            )}
                            title={`${b.client_name} · ${b.service_name}`}
                          >
                            <p className="truncate font-semibold">{formatTime(b.start_at)}</p>
                            <p className="truncate opacity-80">{b.client_name}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
