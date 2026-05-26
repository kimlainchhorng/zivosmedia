/**
 * SalonTimeClockSection — front-of-house clock-in / clock-out per stylist.
 * Shows each stylist as a card with live elapsed time when they're on the
 * clock and a week-to-date hours summary below. Hours are stored in
 * salon_time_entries; commissions/payroll can join against this.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, Square, Clock, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import { useSalonTimeEntries, type SalonTimeEntry } from "@/hooks/salon/useSalonTimeEntries";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

const formatElapsed = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

const formatHours = (ms: number) => {
  const hours = ms / 3_600_000;
  return hours.toFixed(2) + "h";
};

const formatTimeOfDay = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function SalonTimeClockSection({ storeId }: Props) {
  const { stylists, loading: stylistsLoading } = useSalonStylists(storeId);
  const { entries, loading, error, refresh, clockIn, clockOut, remove } = useSalonTimeEntries(storeId);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 1s tick so live "on the clock" elapsed time stays current.
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const open = entries.some((e) => e.end_at === null);
    if (!open) return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [entries]);

  const byStylist = useMemo(() => {
    const m = new Map<string, SalonTimeEntry[]>();
    for (const e of entries) {
      const arr = m.get(e.stylist_id) ?? [];
      arr.push(e);
      m.set(e.stylist_id, arr);
    }
    return m;
  }, [entries]);

  const summary = useMemo(() => {
    const start = todayStart();
    let openCount = 0;
    let todayMs = 0;
    let weekMs = 0;
    for (const e of entries) {
      const sMs = new Date(e.start_at).getTime();
      const eMs = e.end_at ? new Date(e.end_at).getTime() : nowTs;
      const span = Math.max(0, eMs - sMs);
      weekMs += span;
      if (sMs >= start) todayMs += span;
      if (e.end_at === null) openCount += 1;
    }
    return { openCount, todayMs, weekMs };
  }, [entries, nowTs]);

  const handleClockIn = async (stylistId: string) => {
    setBusyId(stylistId);
    try {
      await clockIn(stylistId);
      toast.success("Clocked in.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleClockOut = async (entryId: string, stylistId: string, elapsedMs: number, stylistName: string) => {
    // Closing a shift is reversible only via delete + re-create, which loses
    // the original timestamp precision. Add a confirmation showing how long
    // the shift's been running so a stray click can't end a four-hour shift
    // by accident.
    if (!window.confirm(`Clock ${stylistName} out after ${formatElapsed(elapsedMs)}?`)) return;
    setBusyId(stylistId);
    try {
      await clockOut(entryId);
      toast.success("Clocked out.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Delete this time entry?")) return;
    try {
      await remove(entryId);
      toast.success("Deleted.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading || stylistsLoading) {
    return <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryStat label="On the clock" value={`${summary.openCount}`} />
        <SummaryStat label="Hours today" value={formatHours(summary.todayMs)} />
        <SummaryStat label="Hours this week" value={formatHours(summary.weekMs)} />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mr-1.5 inline h-4 w-4" /> {error}
        </div>
      )}

      {stylists.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Add stylists in the Stylists tab to use the time clock.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stylists.map((s) => {
            const list = byStylist.get(s.id) ?? [];
            const open = list.find((e) => e.end_at === null);
            const todayList = list.filter((e) => new Date(e.start_at).getTime() >= todayStart());
            const onClock = !!open;
            const elapsed = open ? nowTs - new Date(open.start_at).getTime() : 0;
            return (
              <Card key={s.id} className={cn("rounded-2xl", onClock && "border-emerald-500/40 bg-emerald-500/5")}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{s.display_name}</CardTitle>
                    {onClock ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        On the clock · {formatElapsed(elapsed)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Off the clock</p>
                    )}
                  </div>
                  {onClock ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={busyId === s.id}
                      onClick={() => open && handleClockOut(open.id, s.id, elapsed, s.display_name)}
                    >
                      <Square className="h-3.5 w-3.5" /> Clock out
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={busyId === s.id}
                      onClick={() => handleClockIn(s.id)}
                    >
                      <Play className="h-3.5 w-3.5" /> Clock in
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {todayList.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No shifts logged today.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {todayList.map((e) => {
                        const span = Math.max(0, (e.end_at ? new Date(e.end_at).getTime() : nowTs) - new Date(e.start_at).getTime());
                        return (
                          <li key={e.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5">
                            <span className="inline-flex items-center gap-1.5 font-mono text-foreground/85">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatTimeOfDay(e.start_at)} – {e.end_at ? formatTimeOfDay(e.end_at) : "now"}
                            </span>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-muted-foreground">{formatHours(span)}</span>
                              <button
                                type="button"
                                onClick={() => handleDelete(e.id)}
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Delete entry"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => void refresh()} className="text-xs">Refresh</Button>
      </div>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
