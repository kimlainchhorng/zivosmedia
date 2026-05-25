/**
 * SalonStylistSchedulesSection — set weekly working hours per stylist.
 * One row per (stylist, day_of_week). Used (later) to validate booking
 * times and to drive the public booking site's availability calculation.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar, Loader2, AlertCircle, UserCog, Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import { useSalonStoreClosures } from "@/hooks/salon/useSalonStoreClosures";

interface SalonStylistSchedulesSectionProps {
  storeId: string;
}

interface ScheduleRow {
  id: string;
  stylist_id: string;
  day_of_week: number; // 0=Sun ... 6=Sat
  is_working: boolean;
  start_time: string | null; // "09:00:00"
  end_time: string | null;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_HOURS = { start: "09:00", end: "17:00" };

function defaultsForStylist(stylistId: string): Omit<ScheduleRow, "id">[] {
  return DAYS.map((_, i) => ({
    stylist_id: stylistId,
    day_of_week: i,
    is_working: i >= 1 && i <= 5, // M-F default
    start_time: i >= 1 && i <= 5 ? `${DEFAULT_HOURS.start}:00` : null,
    end_time: i >= 1 && i <= 5 ? `${DEFAULT_HOURS.end}:00` : null,
  }));
}

const hhmm = (timeStr: string | null) => (timeStr ? timeStr.slice(0, 5) : "");

export default function SalonStylistSchedulesSection({ storeId }: SalonStylistSchedulesSectionProps) {
  const { stylists, loading: stylistsLoading } = useSalonStylists(storeId);
  const activeStylists = useMemo(() => stylists.filter((s) => s.is_active), [stylists]);

  const [selectedStylistId, setSelectedStylistId] = useState<string>("");
  const [rows, setRows] = useState<Record<number, ScheduleRow & { dirty?: boolean }>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeStylists.length > 0 && !selectedStylistId) {
      setSelectedStylistId(activeStylists[0].id);
    }
  }, [activeStylists, selectedStylistId]);

  useEffect(() => {
    if (!selectedStylistId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("salon_stylist_schedules")
        .select("*")
        .eq("stylist_id", selectedStylistId);
      if (cancelled) return;
      if (err) {
        console.error("[SalonStylistSchedules] load failed", err);
        setError("Couldn't load schedule.");
        setLoading(false);
        return;
      }
      const existing: ScheduleRow[] = (data ?? []) as unknown as ScheduleRow[];
      const map: Record<number, ScheduleRow & { dirty?: boolean }> = {};
      const defaults = defaultsForStylist(selectedStylistId);
      for (const def of defaults) {
        const found = existing.find((r) => r.day_of_week === def.day_of_week);
        map[def.day_of_week] = found ?? { ...def, id: "" };
      }
      setRows(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [selectedStylistId]);

  const updateDay = (day: number, patch: Partial<ScheduleRow>) => {
    setRows((prev) => {
      const cur = prev[day];
      if (!cur) return prev;
      return { ...prev, [day]: { ...cur, ...patch, dirty: true } };
    });
  };

  const saveAll = async () => {
    if (!selectedStylistId) return;
    const dirtyRows = Object.values(rows).filter((r) => r.dirty);
    if (dirtyRows.length === 0) {
      toast.info("No changes to save.");
      return;
    }
    setSaving(true);
    setError(null);
    const payloads = dirtyRows.map((r) => ({
      store_id: storeId,
      stylist_id: selectedStylistId,
      day_of_week: r.day_of_week,
      is_working: r.is_working,
      start_time: r.is_working ? (r.start_time || `${DEFAULT_HOURS.start}:00`) : null,
      end_time: r.is_working ? (r.end_time || `${DEFAULT_HOURS.end}:00`) : null,
    }));
    const { error: err } = await supabase
      .from("salon_stylist_schedules")
      .upsert(payloads as never, { onConflict: "stylist_id,day_of_week" });
    setSaving(false);
    if (err) {
      console.error("[SalonStylistSchedules] save failed", err);
      setError("Couldn't save schedule.");
      return;
    }
    toast.success("Schedule saved.");
    setRows((prev) => {
      const next: typeof prev = {};
      for (const k of Object.keys(prev)) {
        const r = prev[+k];
        next[+k] = { ...r, dirty: false };
      }
      return next;
    });
  };

  const copyToAll = () => {
    const monday = rows[1];
    if (!monday) return;
    setRows((prev) => {
      const next: typeof prev = { ...prev };
      for (let i = 0; i < 7; i++) {
        next[i] = { ...prev[i], is_working: monday.is_working, start_time: monday.start_time, end_time: monday.end_time, dirty: true };
      }
      return next;
    });
    toast.info("Applied Monday's hours to every day. Remember to Save.");
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <StoreClosuresCard storeId={storeId} />

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" /> Stylist Schedules
            </CardTitle>
            <Button onClick={saveAll} size="sm" disabled={saving || loading || !selectedStylistId} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save schedule
            </Button>
          </div>
          {!stylistsLoading && activeStylists.length === 0 && (
            <p className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/8 p-3 text-xs text-amber-700 dark:text-amber-300">
              Add at least one active stylist before you can set schedules.
            </p>
          )}
          {activeStylists.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="schStylist" className="inline-flex items-center gap-1.5"><UserCog className="h-3.5 w-3.5" /> Stylist</Label>
              <select id="schStylist" value={selectedStylistId} onChange={(e) => setSelectedStylistId(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                {activeStylists.map((s) => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
              <Button type="button" size="sm" variant="ghost" onClick={copyToAll} className="text-xs">
                Copy Monday → all days
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : !selectedStylistId ? null : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {DAYS.map((d, i) => {
                const r = rows[i];
                if (!r) return null;
                return (
                  <div key={i} className="grid grid-cols-[80px_1fr_1fr_120px] items-center gap-3 p-3">
                    <p className="text-sm font-semibold text-foreground">{d}</p>
                    <Input
                      type="time"
                      step={900}
                      value={hhmm(r.start_time)}
                      onChange={(e) => updateDay(i, { start_time: e.target.value ? `${e.target.value}:00` : null })}
                      disabled={!r.is_working}
                    />
                    <Input
                      type="time"
                      step={900}
                      value={hhmm(r.end_time)}
                      onChange={(e) => updateDay(i, { end_time: e.target.value ? `${e.target.value}:00` : null })}
                      disabled={!r.is_working}
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <Switch
                        checked={r.is_working}
                        onCheckedChange={(v) => updateDay(i, { is_working: v })}
                      />
                      <span className={r.is_working ? "text-foreground" : "text-muted-foreground"}>
                        {r.is_working ? "Working" : "Off"}
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Schedules drive availability on the booking site and warn you if a booking falls outside hours. Save when you're done.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline closures sub-card — kept here so closures live alongside the weekly
// schedule UI they conceptually pair with.
function StoreClosuresCard({ storeId }: { storeId: string }) {
  const { closures, loading, error, add, remove } = useSalonStoreClosures(storeId);
  const [date, setDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [allDay, setAllDay] = useState(true);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    if (!date) { toast.error("Pick a date."); return; }
    const startISO = new Date(`${date}T${allDay ? "00:00" : startTime}:00`).toISOString();
    const endLocal = allDay
      ? `${date}T23:59:59`
      : `${date}T${endTime}:00`;
    const endISO = new Date(endLocal).toISOString();
    if (new Date(endISO) <= new Date(startISO)) {
      toast.error("End must be after start.");
      return;
    }
    setBusy(true);
    try {
      await add({ start_at: startISO, end_at: endISO, reason });
      toast.success(allDay ? "Closure added (all day)." : "Closure added.");
      setReason("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Closure removed.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const formatRange = (s: string, e: string) => {
    const sd = new Date(s);
    const ed = new Date(e);
    const sameDay = sd.toDateString() === ed.toDateString();
    const dateStr = sd.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const startHMM = sd.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const endHMM = ed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    // Heuristic: 00:00–23:59 on the same day = "all day".
    const isAllDay = sameDay && sd.getHours() === 0 && sd.getMinutes() === 0 && (ed.getHours() === 23 && ed.getMinutes() === 59);
    if (isAllDay) return `${dateStr} · All day`;
    if (sameDay) return `${dateStr} · ${startHMM}–${endHMM}`;
    return `${dateStr} ${startHMM} → ${ed.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${endHMM}`;
  };

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" /> Store Closures
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Block off the whole shop for holidays or vacation. Bookings overlapping a closure are rejected automatically.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{error}</p>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-end">
          <div>
            <Label htmlFor="closure-date" className="text-xs">Date</Label>
            <Input id="closure-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-1.5 self-end pb-2">
            <Switch id="closure-all-day" checked={allDay} onCheckedChange={setAllDay} />
            <Label htmlFor="closure-all-day" className="text-xs">All day</Label>
          </div>
          {!allDay && (
            <>
              <div>
                <Label htmlFor="closure-start" className="text-xs">From</Label>
                <Input id="closure-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="closure-end" className="text-xs">To</Label>
                <Input id="closure-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </>
          )}
          <Button size="sm" disabled={busy} onClick={() => void handleAdd()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add closure"}
          </Button>
        </div>
        <div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason (e.g. Christmas Day, Staff training)"
            maxLength={120}
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : closures.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            No closures scheduled. The shop is open per each stylist's regular hours.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {closures.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-foreground">{formatRange(c.start_at, c.end_at)}</p>
                  {c.reason && <p className="truncate text-xs text-muted-foreground">{c.reason}</p>}
                </div>
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(c.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
