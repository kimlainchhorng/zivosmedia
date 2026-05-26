/**
 * Full timeline + ROI for a single vehicle. Opens from the Fleet section.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Car, DollarSign, Wrench, Wallet, Loader2, CalendarRange, TrendingUp, Gauge, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { CarRentalVehicle } from "@/hooks/car-rental/useCarRentalVehicles";

interface Props {
  vehicle: CarRentalVehicle | null;
  onClose: () => void;
}

interface AvailabilitySpan {
  starts_at: string;
  ends_at: string;
  kind: "reservation" | "blackout";
  status?: string;
  label: string;
}

interface Reservation {
  id: string;
  customer_name: string;
  pickup_at: string;
  dropoff_at: string;
  rental_days: number;
  total_cents: number;
  status: string;
  confirmation_code: string;
}
interface Maintenance {
  id: string;
  service_type: string;
  description: string;
  cost_cents: number;
  service_date: string;
  shop: string | null;
  odometer: number | null;
}
interface Expense {
  id: string;
  category: string;
  description: string;
  amount_cents: number;
  expense_date: string;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalVehicleDetailDialog({ vehicle, onClose }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [blackouts, setBlackouts] = useState<Array<{ starts_at: string; ends_at: string; reason: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"timeline" | "maintenance" | "expenses">("timeline");

  useEffect(() => {
    if (!vehicle) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [resR, maintR, expR, blackR] = await Promise.all([
        supabase.from("car_rental_reservations")
          .select("id, customer_name, pickup_at, dropoff_at, rental_days, total_cents, status, confirmation_code")
          .eq("vehicle_id", vehicle.id)
          .order("pickup_at", { ascending: false })
          .limit(100),
        supabase.from("car_rental_maintenance")
          .select("id, service_type, description, cost_cents, service_date, shop, odometer")
          .eq("vehicle_id", vehicle.id)
          .order("service_date", { ascending: false })
          .limit(50),
        supabase.from("car_rental_expenses")
          .select("id, category, description, amount_cents, expense_date")
          .eq("vehicle_id", vehicle.id)
          .order("expense_date", { ascending: false })
          .limit(50),
        supabase.from("car_rental_vehicle_blackouts")
          .select("starts_at, ends_at, reason")
          .eq("vehicle_id", vehicle.id)
          .order("starts_at", { ascending: true })
          .limit(30),
      ]);
      if (cancelled) return;
      setReservations((resR.data ?? []) as unknown as Reservation[]);
      setMaintenance((maintR.data ?? []) as unknown as Maintenance[]);
      setExpenses((expR.data ?? []) as unknown as Expense[]);
      setBlackouts((blackR.data ?? []) as unknown as typeof blackouts);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [vehicle]);

  const stats = useMemo(() => {
    if (!vehicle) return null;
    const completed = reservations.filter((r) => r.status === "returned");
    const totalRevenue = completed.reduce((s, r) => s + r.total_cents, 0);
    const totalDays = completed.reduce((s, r) => s + r.rental_days, 0);
    const totalMaintenance = maintenance.reduce((s, m) => s + m.cost_cents, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount_cents, 0);
    const netProfit = totalRevenue - totalMaintenance - totalExpenses;
    const avgDailyRevenue = totalDays > 0 ? totalRevenue / totalDays : 0;
    return { completed: completed.length, totalRevenue, totalDays, totalMaintenance, totalExpenses, netProfit, avgDailyRevenue };
  }, [reservations, maintenance, expenses, vehicle]);

  if (!vehicle) return null;

  const v = vehicle;
  const headline = `${v.year ? `${v.year} ` : ""}${v.make} ${v.model}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" /> {headline}
            <span className="text-xs font-normal text-muted-foreground capitalize">· {v.category}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Mini label="Plate" value={v.license_plate ?? "—"} mono />
            <Mini label="VIN" value={v.vin ?? "—"} mono />
            <Mini label="Odometer" value={`${v.current_odometer.toLocaleString()} mi`} />
            <Mini label="Status" value={v.status} cap />
          </div>

          {/* Features */}
          {Array.isArray(v.features) && v.features.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Features
              </p>
              <div className="flex flex-wrap gap-1.5">
                {v.features.map((f, i) => (
                  <span key={`${f}-${i}`} className="inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent service — compact summary visible across all tabs */}
          {!loading && maintenance.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <Wrench className="h-3 w-3" /> Recent service
              </p>
              <ul className="space-y-1">
                {maintenance.slice(0, 3).map((m) => (
                  <li key={m.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="truncate text-foreground">
                      <span className="capitalize font-semibold">{m.service_type.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground"> · {new Date(m.service_date).toLocaleDateString()}</span>
                      {m.odometer && <span className="text-muted-foreground"> · {m.odometer.toLocaleString()} mi</span>}
                    </span>
                    <span className="font-mono text-muted-foreground shrink-0">{formatMoney(m.cost_cents)}</span>
                  </li>
                ))}
              </ul>
              {maintenance.length > 3 && (
                <button
                  type="button"
                  onClick={() => setTab("maintenance")}
                  className="mt-1 text-[10px] text-primary hover:underline"
                >
                  See all {maintenance.length} services →
                </button>
              )}
            </div>
          )}

          {/* 30-day availability strip */}
          {!loading && (
            <AvailabilityStrip reservations={reservations} blackouts={blackouts} />
          )}

          {/* ROI Stats */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat icon={DollarSign} label="Revenue" value={formatMoney(stats.totalRevenue)} sub={`${stats.completed} completed`} />
                <Stat icon={CalendarRange} label="Rental days" value={String(stats.totalDays)} sub={stats.completed > 0 ? `avg ${(stats.totalDays / stats.completed).toFixed(1)} d` : "—"} />
                <Stat icon={Wrench} label="Maint. + expenses" value={formatMoney(stats.totalMaintenance + stats.totalExpenses)} sub={`${maintenance.length + expenses.length} entries`} />
                <Stat icon={TrendingUp} label="Net profit" value={formatMoney(stats.netProfit)} sub={`${formatMoney(Math.round(stats.avgDailyRevenue))}/rental day`} tone={stats.netProfit >= 0 ? "ok" : "warn"} />
              </div>

              {/* Tab switcher */}
              <div className="flex items-center gap-1 border-b border-border">
                <TabBtn active={tab === "timeline"} onClick={() => setTab("timeline")}>
                  Timeline ({reservations.length})
                </TabBtn>
                <TabBtn active={tab === "maintenance"} onClick={() => setTab("maintenance")}>
                  Maintenance ({maintenance.length})
                </TabBtn>
                <TabBtn active={tab === "expenses"} onClick={() => setTab("expenses")}>
                  Expenses ({expenses.length})
                </TabBtn>
              </div>

              {tab === "timeline" && (
                reservations.length === 0 ? (
                  <Empty icon={CalendarRange} text="No reservations for this vehicle yet." />
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {reservations.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate text-sm font-semibold text-foreground">{r.customer_name}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">{r.confirmation_code}</span>
                            <StatusPill status={r.status} />
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {new Date(r.pickup_at).toLocaleDateString()} → {new Date(r.dropoff_at).toLocaleDateString()} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === "maintenance" && (
                maintenance.length === 0 ? (
                  <Empty icon={Wrench} text="No maintenance recorded for this vehicle." />
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {maintenance.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 p-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-600">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground capitalize">
                            {m.service_type.replace(/_/g, " ")} — {m.description}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {new Date(m.service_date).toLocaleDateString()}
                            {m.shop ? ` · ${m.shop}` : ""}
                            {m.odometer ? ` · ${m.odometer.toLocaleString()} mi` : ""}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatMoney(m.cost_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {tab === "expenses" && (
                expenses.length === 0 ? (
                  <Empty icon={Wallet} text="No expenses tagged to this vehicle." />
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {expenses.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 p-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{e.description}</p>
                          <p className="truncate text-[11px] text-muted-foreground capitalize">
                            {e.category.replace(/_/g, " ")} · {new Date(e.expense_date).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatMoney(e.amount_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AvailabilityStrip({
  reservations, blackouts,
}: {
  reservations: Reservation[];
  blackouts: Array<{ starts_at: string; ends_at: string; reason: string | null }>;
}) {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = 30;
  const end = start + days * dayMs;

  const spans: Array<{ from: number; to: number; kind: "reservation" | "blackout"; tone: string; label: string }> = [];
  for (const r of reservations) {
    if (r.status === "cancelled" || r.status === "no_show") continue;
    const from = Math.max(start, new Date(r.pickup_at).getTime());
    const to = Math.min(end, new Date(r.dropoff_at).getTime());
    if (to <= from) continue;
    const tone =
      r.status === "picked_up" ? "bg-emerald-500/80"
      : r.status === "returned" ? "bg-emerald-500/40"
      : r.status === "pending" ? "bg-amber-500/80"
      : "bg-primary/80";
    spans.push({ from, to, kind: "reservation", tone, label: `${r.customer_name} · ${r.confirmation_code}` });
  }
  for (const b of blackouts) {
    const from = Math.max(start, new Date(b.starts_at).getTime());
    const to = Math.min(end, new Date(b.ends_at).getTime());
    if (to <= from) continue;
    spans.push({ from, to, kind: "blackout", tone: "bg-muted-foreground/60", label: `Blackout${b.reason ? ` · ${b.reason}` : ""}` });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Next 30 days availability
      </p>
      <div className="relative">
        {/* Day grid background */}
        <div className="grid gap-px overflow-hidden rounded" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
          {Array.from({ length: days }).map((_, i) => {
            const dayStart = start + i * dayMs;
            const d = new Date(dayStart);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const isToday = i === 0;
            return (
              <div key={i} className={cn(
                "h-10 flex items-end justify-center pb-0.5",
                isWeekend ? "bg-muted/40" : "bg-muted/10",
                isToday && "ring-1 ring-inset ring-primary",
              )}>
                {(i === 0 || d.getDate() === 1 || i % 5 === 0) && (
                  <span className={cn("text-[9px]", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                    {d.getDate()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Reservation/blackout overlays */}
        <div className="pointer-events-none absolute inset-0">
          {spans.map((s, i) => {
            const leftPct = ((s.from - start) / (days * dayMs)) * 100;
            const widthPct = ((s.to - s.from) / (days * dayMs)) * 100;
            return (
              <div
                key={i}
                className={cn("pointer-events-auto absolute top-1 h-3 rounded-sm border border-white/30", s.tone)}
                style={{ left: `${leftPct}%`, width: `${Math.max(0.5, widthPct)}%` }}
                title={s.label}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        <Legend tone="bg-emerald-500/80" label="On rental" />
        <Legend tone="bg-emerald-500/40" label="Returned" />
        <Legend tone="bg-primary/80" label="Confirmed" />
        <Legend tone="bg-amber-500/80" label="Pending" />
        <Legend tone="bg-muted-foreground/60" label="Blackout" />
      </div>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("inline-block h-2 w-3 rounded-sm", tone)} />
      {label}
    </span>
  );
}

function Mini({ label, value, mono, cap }: { label: string; value: string; mono?: boolean; cap?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("truncate text-xs font-semibold text-foreground", mono && "font-mono", cap && "capitalize")}>{value}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = "neutral" }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-3",
      tone === "warn" && "border-amber-500/30 bg-amber-500/5",
      tone === "ok" && "border-emerald-500/30 bg-emerald-500/5",
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn(
      "px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-colors",
      active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
    )}>
      {children}
    </button>
  );
}

function Empty({ icon: Icon, text }: { icon: typeof Wrench; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-2 h-8 w-8 opacity-50" />
      {text}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : status === "confirmed" ? "bg-primary/10 text-primary border-primary/30"
    : status === "picked_up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : status === "returned" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 opacity-75"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", tone)}>
      {status === "no_show" ? "no-show" : status === "picked_up" ? "on rental" : status}
    </span>
  );
}

// Suppress unused
void Gauge;
void AlertTriangle;
