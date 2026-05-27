/**
 * Four mini sparklines under the dashboard KPIs. Plain divs (no Radix Card/Slot)
 * to keep ref-merging out of the render path.
 */
import { memo, useEffect, useMemo, useState } from "react";
import { DollarSign, CalendarRange, Car, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

interface ReservationLite {
  pickup_at: string;
  returned_at: string | null;
  rental_days: number;
  total_cents: number;
  status: string;
  created_at: string;
}

const dayMs = 24 * 60 * 60 * 1000;
const DAYS = 14;
const formatMoney = (cents: number) => `$${(cents / 100).toFixed(0)}`;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function CarRentalSparklineRowInner({ storeId }: Props) {
  const [rows, setRows] = useState<ReservationLite[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cutoff = new Date(Date.now() - DAYS * dayMs).toISOString();
      const { data } = await supabase
        .from("car_rental_reservations")
        .select("pickup_at, returned_at, rental_days, total_cents, status, created_at")
        .eq("store_id", storeId)
        .or(`created_at.gte.${cutoff},returned_at.gte.${cutoff},pickup_at.gte.${cutoff}`);
      if (cancelled) return;
      setRows((data ?? []) as unknown as ReservationLite[]);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const series = useMemo(() => {
    if (!rows) return null;
    const todayStart = startOfDay(new Date()).getTime();
    const revenue = new Array(DAYS).fill(0);
    const bookings = new Array(DAYS).fill(0);
    const active = new Array(DAYS).fill(0);
    const lengthSum = new Array(DAYS).fill(0);
    const lengthCount = new Array(DAYS).fill(0);
    for (const r of rows) {
      const created = new Date(r.created_at).getTime();
      const returned = r.returned_at ? new Date(r.returned_at).getTime() : null;
      const pickup = new Date(r.pickup_at).getTime();
      for (let i = 0; i < DAYS; i++) {
        const start = todayStart - (DAYS - 1 - i) * dayMs;
        const end = start + dayMs;
        if (created >= start && created < end) bookings[i]++;
        if (returned !== null && returned >= start && returned < end && r.status === "returned") {
          revenue[i] += r.total_cents;
          lengthSum[i] += r.rental_days;
          lengthCount[i]++;
        }
        if ((r.status === "picked_up" || r.status === "returned") && pickup < end) {
          const dropoff = returned ?? new Date(r.pickup_at).getTime() + r.rental_days * dayMs;
          if (dropoff > start) active[i]++;
        }
      }
    }
    const avgLength = lengthSum.map((s, i) => lengthCount[i] > 0 ? s / lengthCount[i] : 0);
    return { revenue, bookings, active, avgLength };
  }, [rows]);

  if (!series) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-3">
            <div className="h-12 animate-pulse rounded bg-muted/50" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { icon: DollarSign, label: "Revenue", values: series.revenue, format: (v: number) => formatMoney(Math.round(v)), tone: "primary" as const, sumStat: true },
    { icon: CalendarRange, label: "Bookings created", values: series.bookings, format: (v: number) => String(Math.round(v)), tone: "primary" as const, sumStat: true },
    { icon: Car, label: "Active rentals (peak)", values: series.active, format: (v: number) => String(Math.round(v)), tone: "emerald" as const, sumStat: false },
    { icon: Clock, label: "Avg length (days)", values: series.avgLength, format: (v: number) => v.toFixed(1), tone: "neutral" as const, sumStat: false },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const half = Math.floor(c.values.length / 2);
        const prevSum = c.values.slice(0, half).reduce((a, b) => a + b, 0);
        const nowSum = c.values.slice(half).reduce((a, b) => a + b, 0);
        const delta = prevSum === 0 ? (nowSum > 0 ? 100 : 0) : Math.round(((nowSum - prevSum) / prevSum) * 100);
        const headline = c.sumStat ? nowSum : Math.max(...c.values);
        return (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <c.icon className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-wider">{c.label}</p>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <p className="text-xl font-bold text-foreground tabular-nums">{c.format(headline)}</p>
              <DeltaPill delta={delta} />
            </div>
            <Sparkline values={c.values} tone={c.tone} />
            <p className="text-[10px] text-muted-foreground mt-1">
              Last 14 days · {c.sumStat ? "weekly total" : "peak / avg"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

const CarRentalSparklineRow = memo(CarRentalSparklineRowInner);
export default CarRentalSparklineRow;

function Sparkline({ values, tone }: { values: number[]; tone: "primary" | "emerald" | "neutral" }) {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const w = 100;
  const h = 28;
  const stepX = w / Math.max(1, values.length - 1);
  const coords = values.map((v, i) => {
    const norm = (v - min) / (max - min || 1);
    const y = h - norm * (h - 4) - 2;
    return `${i * stepX},${y}`;
  });
  const fillPath = `M0,${h} L${coords.join(" L")} L${w},${h} Z`;
  const linePath = `M${coords.join(" L")}`;
  const stroke = tone === "primary" ? "stroke-primary" : tone === "emerald" ? "stroke-emerald-500" : "stroke-muted-foreground";
  const fill = tone === "primary" ? "fill-primary/15" : tone === "emerald" ? "fill-emerald-500/15" : "fill-muted-foreground/15";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-1.5 h-7 w-full">
      <path d={fillPath} className={cn(fill, "stroke-none")} />
      <path d={linePath} className={cn(stroke, "fill-none stroke-[1.5]")} />
    </svg>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
        <Minus className="h-2.5 w-2.5" /> flat
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
      up ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    )}>
      {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {up ? "+" : ""}{delta}%
    </span>
  );
}
