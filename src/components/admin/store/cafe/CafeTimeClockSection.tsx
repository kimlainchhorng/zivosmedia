/**
 * CafeTimeClockSection — live clock-in / clock-out plus a 14-day log.
 * "Live" rows update their elapsed time every 30s without hitting the DB.
 */
import { useEffect, useMemo, useState } from "react";
import { Clock, LogIn, LogOut, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCafeBaristas } from "@/hooks/cafe/useCafeBaristas";
import { useCafeTimeClock, type CafeTimeEntry } from "@/hooks/cafe/useCafeTimeClock";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }
const fmtHrs = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfWeek = (d = new Date()) => {
  const x = startOfDay(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  return x;
};

export default function CafeTimeClockSection({ storeId }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const { baristas, loading: bLoading } = useCafeBaristas(storeId);
  const { entries, openByBarista, loading: tLoading, saving, clockIn, clockOut, removeEntry } = useCafeTimeClock(storeId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const activeBaristas = baristas.filter((b) => b.is_active);

  // Aggregate week-to-date hours & wages per barista.
  const wtdByBarista = useMemo(() => {
    const cutoff = startOfWeek().getTime();
    const map = new Map<string, { minutes: number; wage_cents: number }>();
    for (const e of entries) {
      const ts = new Date(e.clock_in).getTime();
      if (ts < cutoff) continue;
      const liveMinutes = e.clock_out ? e.minutes_worked : Math.max(0, Math.floor((now - ts) / 60_000) - e.break_minutes);
      const wage = Math.round((liveMinutes / 60) * e.hourly_rate_cents_snapshot);
      const prev = map.get(e.barista_id) ?? { minutes: 0, wage_cents: 0 };
      prev.minutes += liveMinutes;
      prev.wage_cents += wage;
      map.set(e.barista_id, prev);
    }
    return map;
  }, [entries, now]);

  const handleClockIn = async (baristaId: string) => {
    const r = await clockIn(baristaId);
    if (r) toast.success("Clocked in.");
  };
  const handleClockOut = async (entry: CafeTimeEntry) => {
    await clockOut(entry.id);
    toast.success("Clocked out.");
  };

  if (bLoading || tLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> On the clock</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {activeBaristas.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Add baristas first — see the Baristas & Team tab.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeBaristas.map((b) => {
                const open = openByBarista[b.id];
                const wtd = wtdByBarista.get(b.id) ?? { minutes: 0, wage_cents: 0 };
                const elapsed = open ? Math.max(0, Math.floor((now - new Date(open.clock_in).getTime()) / 60_000)) : 0;
                return (
                  <li key={b.id} className={cn(
                    "rounded-xl border p-3",
                    open ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card",
                  )}>
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-700 font-bold uppercase">
                        {b.display_name.slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm">{b.display_name}</p>
                        <p className="text-[11px] text-muted-foreground">{fmt(b.hourly_rate_cents)}/hr</p>
                      </div>
                      {open && (
                        <Badge className="text-[10px] uppercase bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15">In</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Today</p>
                        <p className="text-lg font-bold tabular-nums">{fmtHrs(elapsed)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">WTD</p>
                        <p className="text-sm tabular-nums">{fmtHrs(wtd.minutes)}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{fmt(wtd.wage_cents)}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      {open ? (
                        <Button size="sm" variant="outline" className="w-full" onClick={() => handleClockOut(open)} disabled={saving}>
                          <LogOut className="h-3.5 w-3.5 mr-1" /> Clock out
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => handleClockIn(b.id)} disabled={saving}>
                          <LogIn className="h-3.5 w-3.5 mr-1" /> Clock in
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent shifts (14d)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No shifts yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {entries.map((e) => {
                const b = baristas.find((x) => x.id === e.barista_id);
                const liveMinutes = e.clock_out ? e.minutes_worked : Math.max(0, Math.floor((now - new Date(e.clock_in).getTime()) / 60_000) - e.break_minutes);
                const wage = Math.round((liveMinutes / 60) * e.hourly_rate_cents_snapshot);
                return (
                  <li key={e.id} className="py-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-medium min-w-0 truncate flex-1">{b?.display_name ?? "—"}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {new Date(e.clock_in).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      {" → "}
                      {e.clock_out ? new Date(e.clock_out).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "open"}
                    </span>
                    {e.break_minutes > 0 && <span className="text-[11px] text-muted-foreground">−{e.break_minutes}m break</span>}
                    <span className="tabular-nums font-medium">{fmtHrs(liveMinutes)}</span>
                    <span className="tabular-nums text-muted-foreground w-16 text-right">{fmt(wage)}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm("Delete this shift?")) removeEntry(e.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
