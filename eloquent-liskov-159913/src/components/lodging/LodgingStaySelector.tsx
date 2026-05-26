/**
 * LodgingStaySelector — sticky bar with check-in/out + guest counters.
 * State persists to URL params (ci, co, ad, ch).
 * Optionally accepts disabledDates + availabilityMap to grey out unavailable nights.
 * `locked` puts it in read-only mode (used after the user advances past Stay step).
 * `showReasonLegend` renders a richer per-reason legend (used in booking drawer).
 */
import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Users, Minus, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/hooks/lodging/useRoomAvailability";

interface Props {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  onChange: (next: { checkIn: string; checkOut: string; adults: number; children: number }) => void;
  /** Optional: pre-computed unavailable dates (manual blocks + active reservations). */
  disabledDates?: Date[];
  /** Optional: per-day availability for tooltip / aria-label reasoning. */
  availabilityMap?: Map<string, DayAvailability>;
  /** Read-only mode: disables popovers + counters. */
  locked?: boolean;
  /** Render richer legend with per-reason swatches. */
  showReasonLegend?: boolean;
  /** Optional: lowest nightly rate (in minor currency units). Renders a "from" badge on the cheapest date. */
  fromPriceCents?: number;
  /** ISO currency code, defaults to USD. */
  currency?: string;
}

const toISO = (d: Date) => format(d, "yyyy-MM-dd");
const today0 = () => new Date(new Date().setHours(0, 0, 0, 0));

export function LodgingStaySelector({
  checkIn, checkOut, adults, children, onChange,
  disabledDates = [], availabilityMap,
  locked = false, showReasonLegend = false,
  fromPriceCents, currency = "USD",
}: Props) {
  const [openGuests, setOpenGuests] = useState(false);
  const ciDate = checkIn ? parseISO(checkIn) : new Date();
  const coDate = checkOut ? parseISO(checkOut) : new Date(Date.now() + 86400000);
  const nights = Math.max(1, Math.round((coDate.getTime() - ciDate.getTime()) / 86400000));

  const isDisabled = (d: Date, mode: "in" | "out") => {
    if (mode === "in" && d < today0()) return true;
    if (mode === "out" && d <= ciDate) return true;
    const iso = format(d, "yyyy-MM-dd");
    return availabilityMap?.get(iso)?.unavailable ?? disabledDates.some((x) => format(x, "yyyy-MM-dd") === iso);
  };

  const dayLabel = (d: Date) => {
    const hit = availabilityMap?.get(format(d, "yyyy-MM-dd"));
    if (!hit?.unavailable) return undefined;
    return hit.reason === "sold_out" ? "Sold out · already booked" : "Restricted · blocked by host";
  };

  const fromPriceLabel = fromPriceCents != null
    ? new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(fromPriceCents / 100)
    : null;

  /** Renders a tiny "from $X" badge under the first available, non-past day in the visible month (the cheapest entry-point night). */
  const renderDayContent = (date: Date, mode: "in" | "out") => {
    const iso = format(date, "yyyy-MM-dd");
    const isUnavailable = availabilityMap?.get(iso)?.unavailable ?? false;
    const isPast = date < today0();
    const isFirstAvailableOfMonth =
      fromPriceLabel != null &&
      !isUnavailable &&
      !isPast &&
      (mode === "in" ? true : date > ciDate) &&
      date.getDate() === firstAvailableDayOfMonth(date, mode);

    return (
      <span aria-label={dayLabel(date)} title={dayLabel(date)} className="relative inline-flex flex-col items-center leading-none">
        <span>{date.getDate()}</span>
        {isFirstAvailableOfMonth && (
          <span className="absolute -bottom-3 text-[8px] font-bold text-primary whitespace-nowrap">
            {fromPriceLabel}
          </span>
        )}
      </span>
    );
  };

  /** First selectable day-of-month in the same month as `d` (skips past + unavailable). */
  const firstAvailableDayOfMonth = (d: Date, mode: "in" | "out") => {
    const y = d.getFullYear();
    const m = d.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const probe = new Date(y, m, day);
      if (probe < today0()) continue;
      if (mode === "out" && probe <= ciDate) continue;
      const iso = format(probe, "yyyy-MM-dd");
      if (availabilityMap?.get(iso)?.unavailable) continue;
      return day;
    }
    return -1;
  };

  const lockedClass = locked ? "pointer-events-none opacity-70" : "";

  return (
    <div className="space-y-1.5">
      <div className={cn(
        "rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-sm p-2 grid grid-cols-3 gap-1.5",
        lockedClass,
      )}>
        {/* Check-in */}
        <Popover>
          <PopoverTrigger asChild disabled={locked}>
            <button type="button" className="flex flex-col items-start p-2 rounded-lg hover:bg-muted/50 transition text-left" disabled={locked}>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Check-in</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <CalendarIcon className="h-3 w-3" />
                {format(ciDate, "MMM d")}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {fromPriceLabel && (
              <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-foreground">
                From <span className="text-primary">{fromPriceLabel}</span> <span className="text-muted-foreground font-normal">/ night</span>
              </div>
            )}
            <Calendar
              mode="single"
              selected={ciDate}
              onSelect={(d) => d && onChange({
                checkIn: toISO(d),
                checkOut: d >= coDate ? toISO(new Date(d.getTime() + 86400000)) : checkOut,
                adults, children,
              })}
              disabled={(d) => isDisabled(d, "in")}
              modifiers={{
                unavailable: (d) => availabilityMap?.get(format(d, "yyyy-MM-dd"))?.unavailable ?? false,
              }}
              modifiersClassNames={{
                unavailable: "line-through text-muted-foreground/60",
              }}
              components={{
                DayContent: ({ date }: any) => renderDayContent(date, "in"),
              } as any}
              initialFocus
              className={cn("p-3 pointer-events-auto", fromPriceLabel && "pt-1")}
            />
          </PopoverContent>
        </Popover>

        {/* Check-out */}
        <Popover>
          <PopoverTrigger asChild disabled={locked}>
            <button type="button" className="flex flex-col items-start p-2 rounded-lg hover:bg-muted/50 transition text-left border-l border-border/50" disabled={locked}>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Check-out</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <CalendarIcon className="h-3 w-3" />
                {format(coDate, "MMM d")}
              </span>
              <span className="text-[9px] text-muted-foreground">{nights} night{nights > 1 ? "s" : ""}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {fromPriceLabel && (
              <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-foreground">
                From <span className="text-primary">{fromPriceLabel}</span> <span className="text-muted-foreground font-normal">/ night</span>
              </div>
            )}
            <Calendar
              mode="single"
              selected={coDate}
              onSelect={(d) => d && onChange({ checkIn, checkOut: toISO(d), adults, children })}
              disabled={(d) => isDisabled(d, "out")}
              modifiers={{
                unavailable: (d) => availabilityMap?.get(format(d, "yyyy-MM-dd"))?.unavailable ?? false,
              }}
              modifiersClassNames={{
                unavailable: "line-through text-muted-foreground/60",
              }}
              components={{
                DayContent: ({ date }: any) => renderDayContent(date, "out"),
              } as any}
              initialFocus
              className={cn("p-3 pointer-events-auto", fromPriceLabel && "pt-1")}
            />
          </PopoverContent>
        </Popover>

        {/* Guests */}
        <Popover open={openGuests} onOpenChange={(v) => !locked && setOpenGuests(v)}>
          <PopoverTrigger asChild disabled={locked}>
            <button type="button" className="flex flex-col items-start p-2 rounded-lg hover:bg-muted/50 transition text-left border-l border-border/50" disabled={locked}>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Guests</span>
              <span className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3" />
                {adults + children}
              </span>
              <span className="text-[9px] text-muted-foreground">{adults}A{children ? ` · ${children}C` : ""}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 space-y-3" align="end">
            <Counter label="Adults" sub="13+" value={adults} min={1} max={12}
              onChange={(v) => onChange({ checkIn, checkOut, adults: v, children })} />
            <Counter label="Children" sub="0-12" value={children} min={0} max={8}
              onChange={(v) => onChange({ checkIn, checkOut, adults, children: v })} />
            <Button size="sm" className="w-full" onClick={() => setOpenGuests(false)}>Done</Button>
          </PopoverContent>
        </Popover>
      </div>

      {locked && (
        <p className="flex items-center gap-1 text-[10px] text-muted-foreground px-1">
          <Lock className="h-2.5 w-2.5" /> Go back to change dates or guests
        </p>
      )}

      {!locked && availabilityMap && availabilityMap.size > 0 && !showReasonLegend && (
        <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground px-1">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-muted-foreground/40" /> Unavailable</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-primary" /> Selected</span>
        </div>
      )}

      {!locked && showReasonLegend && availabilityMap && availabilityMap.size > 0 && (
        <div className="px-1 space-y-0.5">
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-muted-foreground/40" /> Sold out</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-destructive/30" /> Restricted</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-primary" /> Selected</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm ring-1 ring-accent" /> Today</span>
          </div>
          <p className="text-[9.5px] text-muted-foreground/80">Hover or long-press a date to see why it's unavailable.</p>
        </div>
      )}
    </div>
  );
}

function Counter({ label, sub, value, min, max, onChange }: { label: string; sub: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" disabled={value <= min} onClick={() => onChange(value - 1)}><Minus className="h-3 w-3" /></Button>
        <span className="w-6 text-center text-sm font-bold">{value}</span>
        <Button type="button" size="icon" variant="outline" className="h-7 w-7" disabled={value >= max} onClick={() => onChange(value + 1)}><Plus className="h-3 w-3" /></Button>
      </div>
    </div>
  );
}
