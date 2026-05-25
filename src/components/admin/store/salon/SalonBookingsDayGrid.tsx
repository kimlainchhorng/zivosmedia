/**
 * SalonBookingsDayGrid — visual day-view of bookings.
 * Columns: active stylists (+ an "Unassigned" lane).
 * Rows: 30-min increments from the earliest schedule start to the latest end.
 * Bookings render as positioned blocks. Click a block to edit; click an
 * empty slot to start a new booking pre-filled with that stylist + time.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SalonBooking, SalonBookingStatus } from "@/hooks/salon/useSalonBookings";
import type { SalonStylist } from "@/hooks/salon/useSalonStylists";

interface DaySchedule {
  stylist_id: string;
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface DayBlockout {
  id: string;
  stylist_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

interface SalonBookingsDayGridProps {
  /** YYYY-MM-DD */
  date: string;
  bookings: SalonBooking[];
  stylists: SalonStylist[];
  /** All schedules for the store; will be filtered to this day-of-week internally. */
  schedules: DaySchedule[];
  /** Block-offs for the visible day, by stylist. */
  blockouts?: DayBlockout[];
  onClickBooking: (b: SalonBooking) => void;
  /** stylistId may be empty string for "unassigned". time is HH:MM (24h). */
  onClickEmptySlot: (args: { stylistId: string; time: string }) => void;
}

const ROW_MINUTES = 30;
const PX_PER_ROW = 36; // 30 min → 36px → 72 px/hr
const PX_PER_MIN = PX_PER_ROW / ROW_MINUTES;

const STATUS_TONE: Record<SalonBookingStatus, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  confirmed: "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  completed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  cancelled: "border-border bg-muted text-muted-foreground line-through opacity-60",
  no_show: "border-destructive/40 bg-destructive/10 text-destructive",
};

const formatTime = (hour: number, minute: number) => {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${String(minute).padStart(2, "0")} ${ampm}`;
};

function isoToHourMin(iso: string): { hour: number; minute: number; minutesFromMidnight: number } {
  const d = new Date(iso);
  return { hour: d.getHours(), minute: d.getMinutes(), minutesFromMidnight: d.getHours() * 60 + d.getMinutes() };
}

function timeStringToMinutes(s: string | null | undefined): number | null {
  if (!s) return null;
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export default function SalonBookingsDayGrid({
  date, bookings, stylists, schedules, blockouts = [], onClickBooking, onClickEmptySlot,
}: SalonBookingsDayGridProps) {
  const targetDow = new Date(`${date}T12:00:00`).getDay();
  const todayMidnight = new Date(`${date}T00:00:00`).getTime();
  const tomorrowMidnight = todayMidnight + 24 * 60 * 60 * 1000;

  const activeStylists = useMemo(() => stylists.filter((s) => s.is_active), [stylists]);

  // Compute the day's visible window from schedules (or default 9-6 if none).
  const window = useMemo(() => {
    const todaySchedules = schedules.filter((s) => s.day_of_week === targetDow && s.is_working);
    let startMin = Infinity;
    let endMin = -Infinity;
    for (const s of todaySchedules) {
      const sm = timeStringToMinutes(s.start_time);
      const em = timeStringToMinutes(s.end_time);
      if (sm != null && sm < startMin) startMin = sm;
      if (em != null && em > endMin) endMin = em;
    }
    if (!Number.isFinite(startMin)) startMin = 9 * 60; // 9 AM
    if (!Number.isFinite(endMin)) endMin = 18 * 60; // 6 PM
    // Also widen to include any out-of-hours bookings so they're not clipped.
    for (const b of bookings) {
      const start = new Date(b.start_at).getTime();
      const end = new Date(b.end_at).getTime();
      if (start >= todayMidnight && start < tomorrowMidnight) {
        const sMin = new Date(start).getHours() * 60 + new Date(start).getMinutes();
        const eMin = new Date(end).getHours() * 60 + new Date(end).getMinutes();
        if (sMin < startMin) startMin = Math.floor(sMin / ROW_MINUTES) * ROW_MINUTES;
        if (eMin > endMin) endMin = Math.ceil(eMin / ROW_MINUTES) * ROW_MINUTES;
      }
    }
    // Snap to row boundaries.
    startMin = Math.floor(startMin / ROW_MINUTES) * ROW_MINUTES;
    endMin = Math.ceil(endMin / ROW_MINUTES) * ROW_MINUTES;
    if (endMin <= startMin) endMin = startMin + 8 * 60;
    return { startMin, endMin };
  }, [schedules, targetDow, bookings, todayMidnight, tomorrowMidnight]);

  const totalRows = Math.max(1, (window.endMin - window.startMin) / ROW_MINUTES);

  // Stylist column working windows (for shading off-hours).
  const stylistDayHours = useMemo(() => {
    const m: Record<string, { startMin: number; endMin: number; isWorking: boolean }> = {};
    for (const s of schedules) {
      if (s.day_of_week !== targetDow) continue;
      m[s.stylist_id] = {
        startMin: timeStringToMinutes(s.start_time) ?? 0,
        endMin: timeStringToMinutes(s.end_time) ?? 0,
        isWorking: s.is_working,
      };
    }
    return m;
  }, [schedules, targetDow]);

  // Group bookings by stylist (or unassigned).
  const bookingsByStylist = useMemo(() => {
    const m = new Map<string, SalonBooking[]>();
    for (const b of bookings) {
      const start = new Date(b.start_at).getTime();
      if (start < todayMidnight || start >= tomorrowMidnight) continue;
      const key = b.stylist_id ?? "_unassigned";
      const arr = m.get(key) ?? [];
      arr.push(b);
      m.set(key, arr);
    }
    return m;
  }, [bookings, todayMidnight, tomorrowMidnight]);

  const blockoutsByStylist = useMemo(() => {
    const m = new Map<string, DayBlockout[]>();
    for (const bo of blockouts) {
      const start = new Date(bo.start_at).getTime();
      if (start >= tomorrowMidnight) continue;
      const end = new Date(bo.end_at).getTime();
      if (end <= todayMidnight) continue;
      const arr = m.get(bo.stylist_id) ?? [];
      arr.push(bo);
      m.set(bo.stylist_id, arr);
    }
    return m;
  }, [blockouts, todayMidnight, tomorrowMidnight]);

  // Columns to render. Always include unassigned at the end if there are unassigned bookings.
  const columns = useMemo(() => {
    const cols: { id: string; name: string }[] = activeStylists.map((s) => ({ id: s.id, name: s.display_name }));
    if (bookingsByStylist.has("_unassigned")) {
      cols.push({ id: "_unassigned", name: "Unassigned" });
    }
    return cols;
  }, [activeStylists, bookingsByStylist]);

  const rowTimes: { hour: number; minute: number; minutesFromStart: number; label: string }[] = useMemo(() => {
    const r: typeof rowTimes = [];
    for (let i = 0; i < totalRows; i++) {
      const m = window.startMin + i * ROW_MINUTES;
      const hour = Math.floor(m / 60);
      const minute = m % 60;
      r.push({ hour, minute, minutesFromStart: i * ROW_MINUTES, label: minute === 0 ? formatTime(hour, minute) : "" });
    }
    return r;
  }, [totalRows, window.startMin]);

  if (columns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No active stylists. Add one to use the day view.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div
        className="relative grid"
        style={{
          gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))`,
          minWidth: 64 + columns.length * 140,
        }}
      >
        {/* Top header row */}
        <div className="sticky top-0 z-20 border-b border-r border-border bg-card" />
        {columns.map((c) => (
          <div key={c.id} className="sticky top-0 z-20 border-b border-r border-border bg-card px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-foreground">
            {c.name}
          </div>
        ))}

        {/* Time labels column + grid lines */}
        {rowTimes.map((r) => (
          <div
            key={`time-${r.minutesFromStart}`}
            className="border-r border-border bg-card pr-2 text-right text-[10px] text-muted-foreground"
            style={{ height: PX_PER_ROW, lineHeight: `${PX_PER_ROW}px`, gridColumn: 1 }}
          >
            {r.label}
          </div>
        ))}

        {/* Stylist columns (one column per stylist), all rows in one container with relative positioning. */}
        {columns.map((c, colIdx) => (
          <div
            key={c.id}
            className="relative border-r border-border bg-background"
            style={{
              gridColumn: colIdx + 2,
              gridRow: `2 / span ${totalRows}`,
              height: totalRows * PX_PER_ROW,
            }}
          >
            {/* Off-hours shading */}
            {c.id !== "_unassigned" && (() => {
              const sh = stylistDayHours[c.id];
              if (!sh || !sh.isWorking) {
                return <div className="absolute inset-0 bg-muted/40" aria-hidden="true" />;
              }
              const beforeStart = Math.max(0, sh.startMin - window.startMin);
              const afterEnd = Math.max(0, window.endMin - sh.endMin);
              return (
                <>
                  {beforeStart > 0 && (
                    <div className="absolute left-0 right-0 bg-muted/40" style={{ top: 0, height: beforeStart * PX_PER_MIN }} aria-hidden="true" />
                  )}
                  {afterEnd > 0 && (
                    <div className="absolute left-0 right-0 bg-muted/40" style={{ bottom: 0, height: afterEnd * PX_PER_MIN }} aria-hidden="true" />
                  )}
                </>
              );
            })()}

            {/* Row dividers + empty slot click targets */}
            {rowTimes.map((r) => (
              <button
                key={`empty-${c.id}-${r.minutesFromStart}`}
                type="button"
                aria-label={`New booking · ${c.name} · ${formatTime(r.hour, r.minute)}`}
                onClick={() => onClickEmptySlot({
                  stylistId: c.id === "_unassigned" ? "" : c.id,
                  time: `${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`,
                })}
                className="absolute left-0 right-0 cursor-pointer border-t border-border/50 transition-colors hover:bg-primary/5"
                style={{ top: r.minutesFromStart * PX_PER_MIN, height: PX_PER_ROW }}
              />
            ))}

            {/* Block-outs (rendered behind bookings) */}
            {(blockoutsByStylist.get(c.id) ?? []).map((bo) => {
              const startTs = new Date(bo.start_at).getTime();
              const endTs = new Date(bo.end_at).getTime();
              const visStart = Math.max(startTs, todayMidnight);
              const visEnd = Math.min(endTs, tomorrowMidnight);
              const visStartDate = new Date(visStart);
              const startMinFromMidnight = visStartDate.getHours() * 60 + visStartDate.getMinutes();
              const offset = (startMinFromMidnight - window.startMin) * PX_PER_MIN;
              const lengthMin = (visEnd - visStart) / 60000;
              const height = Math.max(18, lengthMin * PX_PER_MIN - 2);
              return (
                <div
                  key={`bo-${bo.id}`}
                  className="absolute left-1 right-1 overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                  style={{ top: Math.max(0, offset), height }}
                  title={bo.reason ?? "Block-off"}
                >
                  Block-off{bo.reason ? ` · ${bo.reason}` : ""}
                </div>
              );
            })}

            {/* Booking blocks */}
            {(bookingsByStylist.get(c.id) ?? []).map((b) => {
              const start = isoToHourMin(b.start_at);
              const offset = (start.minutesFromMidnight - window.startMin) * PX_PER_MIN;
              const lengthMin = b.duration_minutes;
              const height = Math.max(20, lengthMin * PX_PER_MIN - 2);
              const tone = STATUS_TONE[b.status];
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onClickBooking(b)}
                  className={cn(
                    "absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1 text-left text-[11px] shadow-sm transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-primary/40",
                    tone,
                  )}
                  style={{ top: Math.max(0, offset), height }}
                  title={`${b.client_name} · ${b.service_name}`}
                >
                  <p className="truncate font-semibold">{b.client_name}</p>
                  <p className="truncate opacity-80">
                    {b.service_name} · {formatTime(start.hour, start.minute)}
                  </p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
