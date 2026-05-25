/**
 * SalonDashboardSection — at-a-glance landing page.
 * Pulls today's bookings + roll-up counters from existing tables.
 */
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Calendar, DollarSign, Users, AlarmClockOff,
  CheckCircle2, ArrowRight, Loader2, Cake, UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSalonBookings } from "@/hooks/salon/useSalonBookings";
import { useSalonClients } from "@/hooks/salon/useSalonClients";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import { useSalonServices } from "@/hooks/salon/useSalonServices";
import SalonOnboardingChecklist from "./SalonOnboardingChecklist";
import SalonActivityFeed from "./SalonActivityFeed";
import { supabase } from "@/integrations/supabase/client";

interface SalonDashboardSectionProps {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function SalonDashboardSection({ storeId, onJumpToTab }: SalonDashboardSectionProps) {
  const today = todayIso();
  const { bookings, loading } = useSalonBookings({ storeId, date: today });
  const { clients } = useSalonClients(storeId);
  const { stylists } = useSalonStylists(storeId);
  const { services } = useSalonServices(storeId);

  const stats = useMemo(() => {
    const now = Date.now();
    let confirmed = 0, completed = 0, noShow = 0, cancelled = 0;
    let revenueCents = 0, tipsCents = 0;
    const upcoming: typeof bookings = [];
    for (const b of bookings) {
      if (b.status === "confirmed" || b.status === "pending") confirmed++;
      if (b.status === "completed") {
        completed++;
        revenueCents += b.price_cents + b.tip_cents + b.tax_cents;
        tipsCents += b.tip_cents;
      }
      if (b.status === "no_show") noShow++;
      if (b.status === "cancelled") cancelled++;
      if ((b.status === "confirmed" || b.status === "pending") && new Date(b.start_at).getTime() > now) {
        upcoming.push(b);
      }
    }
    upcoming.sort((a, b) => a.start_at.localeCompare(b.start_at));
    return { confirmed, completed, noShow, cancelled, revenueCents, tipsCents, upcoming: upcoming.slice(0, 5) };
  }, [bookings]);

  const activeServices = services.filter((s) => s.is_active).length;
  const activeStylists = stylists.filter((s) => s.is_active).length;

  // Birthdays in the next 14 days and clients who haven't been back in 60+ days.
  const { birthdays, winBack } = useMemo(() => {
    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const winBackCutoffMs = today0.getTime() - 60 * 24 * 60 * 60 * 1000;
    const horizonDays = 14;

    const bdays: Array<{ id: string; name: string; daysAway: number; birthday: string }> = [];
    const wb: Array<{ id: string; name: string; lastVisit: string | null; daysSince: number; visitsCount: number }> = [];

    for (const c of clients) {
      if (c.is_blocked) continue;

      if (c.birthday) {
        // birthday is "YYYY-MM-DD"; match against the next 14 days ignoring the stored year.
        const [, mm, dd] = c.birthday.split("-").map((p) => Number(p));
        if (Number.isFinite(mm) && Number.isFinite(dd)) {
          const thisYearBday = new Date(now.getFullYear(), mm - 1, dd);
          let nextBday = thisYearBday;
          if (nextBday < today0) {
            nextBday = new Date(now.getFullYear() + 1, mm - 1, dd);
          }
          const daysAway = Math.round((nextBday.getTime() - today0.getTime()) / (24 * 60 * 60 * 1000));
          if (daysAway >= 0 && daysAway <= horizonDays) {
            bdays.push({ id: c.id, name: c.display_name, daysAway, birthday: c.birthday });
          }
        }
      }

      if (c.visits_count > 0 && c.last_visit_at) {
        const lastMs = new Date(c.last_visit_at).getTime();
        if (lastMs < winBackCutoffMs) {
          const daysSince = Math.round((today0.getTime() - lastMs) / (24 * 60 * 60 * 1000));
          wb.push({ id: c.id, name: c.display_name, lastVisit: c.last_visit_at, daysSince, visitsCount: c.visits_count });
        }
      }
    }
    bdays.sort((a, b) => a.daysAway - b.daysAway);
    wb.sort((a, b) => b.daysSince - a.daysSince);
    return { birthdays: bdays, winBack: wb };
  }, [clients]);

  const [storeSlug, setStoreSlug] = useState<string | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("store_profiles").select("slug").eq("id", storeId).maybeSingle();
      if (cancelled) return;
      setStoreSlug((data as any)?.slug);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  return (
    <div className="space-y-4">
      <SalonOnboardingChecklist storeId={storeId} storeSlug={storeSlug} onJumpToTab={onJumpToTab} />

      {/* Top stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Calendar}
          label="Booked today"
          value={String(stats.confirmed + stats.completed)}
          sub={`${stats.confirmed} upcoming · ${stats.completed} done`}
        />
        <StatCard
          icon={DollarSign}
          label="Revenue today"
          value={formatPrice(stats.revenueCents)}
          sub={`${formatPrice(stats.tipsCents)} in tips`}
        />
        <StatCard
          icon={AlarmClockOff}
          label="No-shows today"
          value={String(stats.noShow)}
          sub={stats.cancelled > 0 ? `${stats.cancelled} cancelled` : "All clients showed up"}
          tone={stats.noShow > 0 ? "warn" : "ok"}
        />
        <StatCard
          icon={Users}
          label="Clients in book"
          value={String(clients.length)}
          sub={`${activeStylists} stylists · ${activeServices} services`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming today
            </CardTitle>
            {onJumpToTab && (
              <Button variant="ghost" size="sm" onClick={() => onJumpToTab("salon-bookings")} className="gap-1.5">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : stats.upcoming.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Nothing booked for the rest of today.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {stats.upcoming.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                      {formatTime(b.start_at).replace(" ", "")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{b.client_name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.service_name}{b.stylist_name ? ` · ${b.stylist_name}` : ""}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{formatPrice(b.price_cents)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Quick jump
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {onJumpToTab && [
              { id: "salon-bookings", label: "Bookings" },
              { id: "salon-clients", label: "Clients" },
              { id: "salon-services", label: "Service Menu" },
              { id: "salon-stylists", label: "Stylists" },
              { id: "payment", label: "Payment settings" },
              { id: "salon-reports", label: "Reports" },
            ].map((t) => (
              <Button key={t.id} variant="outline" size="sm" onClick={() => onJumpToTab(t.id)}>
                {t.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-5 w-5 text-pink-500" />
              Birthdays this fortnight
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">next 14 days</span>
          </CardHeader>
          <CardContent>
            {birthdays.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No upcoming birthdays.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {birthdays.slice(0, 6).map((b) => (
                  <li key={b.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-300">
                      <Cake className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{b.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.daysAway === 0 ? "Today" : b.daysAway === 1 ? "Tomorrow" : `in ${b.daysAway} days`}
                        {" · "}
                        {new Date(`2000-${b.birthday.slice(5)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    {onJumpToTab && (
                      <Button variant="ghost" size="sm" onClick={() => onJumpToTab("salon-clients")} className="text-xs">
                        Open
                      </Button>
                    )}
                  </li>
                ))}
                {birthdays.length > 6 && (
                  <li className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                    + {birthdays.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-5 w-5 text-primary" />
              Bring them back
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">last visit 60+ days ago</span>
          </CardHeader>
          <CardContent>
            {winBack.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                Every active client has visited recently. Nice retention.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {winBack.slice(0, 6).map((w) => (
                  <li key={w.id} className="flex items-center gap-3 p-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{w.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.daysSince} days since last visit
                        {" · "}
                        {w.visitsCount} visit{w.visitsCount === 1 ? "" : "s"} total
                      </p>
                    </div>
                    {onJumpToTab && (
                      <Button variant="ghost" size="sm" onClick={() => onJumpToTab("salon-clients")} className="text-xs">
                        Open
                      </Button>
                    )}
                  </li>
                ))}
                {winBack.length > 6 && (
                  <li className="px-3 py-2 text-center text-[11px] text-muted-foreground">
                    + {winBack.length - 6} more
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ReferralBreakdownCard storeId={storeId} />

      <SalonActivityFeed storeId={storeId} onJumpToTab={onJumpToTab} />
    </div>
  );
}

/** Top referral sources in the last 30 days. Counts unique values from
 * salon_bookings.referral_source and ranks them with a horizontal bar. */
function ReferralBreakdownCard({ storeId }: { storeId: string }) {
  const [counts, setCounts] = useState<{ source: string; n: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data } = await supabase
        .from("salon_bookings")
        .select("referral_source")
        .eq("store_id", storeId)
        .not("referral_source", "is", null)
        .gte("start_at", cutoff.toISOString());
      if (cancelled) return;
      const tally = new Map<string, number>();
      for (const row of (data ?? []) as Array<{ referral_source: string | null }>) {
        const s = (row.referral_source ?? "").trim();
        if (!s) continue;
        tally.set(s, (tally.get(s) ?? 0) + 1);
      }
      const arr = Array.from(tally, ([source, n]) => ({ source, n })).sort((a, b) => b.n - a.n);
      setCounts(arr);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  const max = counts[0]?.n ?? 1;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">How clients found us</CardTitle>
        <span className="text-[11px] text-muted-foreground">last 30 days</span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : counts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No referral data yet. Add "How did you hear about us?" when creating bookings to see this break down.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {counts.slice(0, 8).map((c) => (
              <li key={c.source} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-foreground">{c.source}</span>
                  <span className="font-mono text-muted-foreground">{c.n}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${Math.max(4, Math.round((c.n / max) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  icon: typeof Calendar;
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn" | "neutral";
}

function StatCard({ icon: Icon, label, value, sub, tone = "neutral" }: StatCardProps) {
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
