import { useEffect, useMemo, useState } from "react";
import { format, isBefore, startOfToday, addDays, getDay, getDate } from "date-fns";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DateRange } from "react-day-picker";
import { useFareCalendar, type PriceLevel } from "@/hooks/useFareCalendar";

/* ─── Fallback price level (used when API has no data) ─── */
function getFallbackPriceLevel(date: Date): PriceLevel {
  const dow = getDay(date);
  const d = getDate(date);
  const m = date.getMonth();
  const hash = ((d * 31 + m * 17 + dow * 7) % 10);
  if (dow === 5 || dow === 6) return "high";
  if (dow === 0) return hash < 4 ? "high" : "mid";
  if ((dow === 2 || dow === 3) && d >= 8 && d <= 22) return "low";
  if (dow === 1 || dow === 4) return hash < 3 ? "low" : hash < 7 ? "mid" : "high";
  return hash < 4 ? "low" : hash < 7 ? "mid" : "high";
}

const priceLevelConfig = {
  low:  { label: "Low",  bg: "hsl(160 84% 39% / 0.15)", color: "hsl(160 84% 32%)", legendBg: "hsl(160 84% 39% / 0.2)" },
  mid:  { label: "Mid",  bg: "hsl(45 93% 47% / 0.15)",  color: "hsl(35 80% 42%)",  legendBg: "hsl(45 93% 47% / 0.2)" },
  high: { label: "High", bg: "hsl(0 72% 51% / 0.15)",   color: "hsl(0 65% 45%)",   legendBg: "hsl(0 72% 51% / 0.2)" },
};

/* ─── Single-date picker ─── */
interface MobileDatePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  onDateSelect: (date: Date | undefined) => void;
  onDateConfirmed?: (date: Date) => void;
  label?: string;
  minDate?: Date;
  accentColor?: string;
}

export default function MobileDatePickerSheet({
  open,
  onOpenChange,
  selectedDate,
  onDateSelect,
  onDateConfirmed,
  label = "Select date",
  minDate,
}: MobileDatePickerSheetProps) {
  const earliestDate = useMemo(() => {
    const today = startOfToday();
    return minDate && !isBefore(minDate, today) ? minDate : today;
  }, [minDate]);

  const initialMonth = selectedDate && !isBefore(selectedDate, earliestDate) ? selectedDate : earliestDate;
  const [month, setMonth] = useState(initialMonth);

  useEffect(() => {
    if (open) {
      setMonth(selectedDate && !isBefore(selectedDate, earliestDate) ? selectedDate : earliestDate);
    }
  }, [open, selectedDate, earliestDate]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 bg-transparent border-0 shadow-none"
        style={{ paddingBottom: "var(--zivo-safe-bottom,16px)" }}
      >
        <div
          className="mx-3 mb-2 rounded-3xl overflow-hidden animate-scale-in"
          style={{
            background: "hsl(var(--card))",
            boxShadow: `
              0 -2px 0 0 hsl(var(--border) / 0.3),
              0 8px 32px -4px hsl(var(--foreground) / 0.12),
              0 24px 60px -8px hsl(var(--foreground) / 0.08),
              inset 0 1px 0 0 hsl(var(--card) / 0.8)
            `,
            transform: "perspective(800px) rotateX(1deg)",
            transformOrigin: "bottom center",
          }}
        >
          <SheetHeader className="px-5 pt-5 pb-3 text-left relative">
            <SheetTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 45%))",
                  boxShadow: "0 2px 8px hsl(160 84% 39% / 0.3)",
                }}
              >
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              {label}
            </SheetTitle>
          </SheetHeader>

          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          <div className="px-4 py-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--background))",
                boxShadow: "inset 0 2px 6px hsl(var(--foreground) / 0.04), 0 1px 0 hsl(var(--card))",
              }}
            >
              <Calendar
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={selectedDate}
                onSelect={(date) => {
                  onDateSelect(date);
                  if (date) {
                    onDateConfirmed?.(date);
                    onOpenChange(false);
                  }
                }}
                disabled={(date) => isBefore(date, earliestDate)}
                initialFocus
                className="pointer-events-auto p-3"
                classNames={calendarClassNames3D}
              />
            </div>
          </div>

          <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3">
            <div className="min-h-10 text-sm text-muted-foreground font-medium">
              {selectedDate ? `Selected: ${format(selectedDate, "EEE, MMM d")}` : "Tap a date to continue"}
            </div>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="min-w-[100px] h-11 rounded-2xl text-white font-semibold text-sm border-0 active:scale-[0.97] transition-all duration-150"
              style={{
                background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 45%))",
                boxShadow: "0 4px 14px hsl(160 84% 39% / 0.35), 0 1px 3px hsl(160 84% 39% / 0.2), inset 0 1px 0 hsl(160 84% 60% / 0.3)",
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Range picker: departure → return in one sheet ─── */
interface MobileDateRangePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departDate?: Date;
  returnDate?: Date;
  onRangeConfirmed: (depart: Date, ret: Date) => void;
  label?: string;
  minDate?: Date;
  /** IATA origin code for real fare data (e.g. "JFK") */
  origin?: string;
  /** IATA destination code for real fare data (e.g. "LAX") */
  destination?: string;
  cabinClass?: string;
}

export function MobileDateRangePickerSheet({
  open,
  onOpenChange,
  departDate,
  returnDate,
  onRangeConfirmed,
  label = "Departure → Return",
  minDate,
  origin,
  destination,
  cabinClass = "economy",
}: MobileDateRangePickerSheetProps) {
  const earliestDate = useMemo(() => {
    const today = startOfToday();
    return minDate && !isBefore(minDate, today) ? minDate : today;
  }, [minDate]);

  const [range, setRange] = useState<DateRange | undefined>(
    departDate ? { from: departDate, to: returnDate } : undefined
  );
  const [month, setMonth] = useState<Date>(departDate ?? earliestDate);

  useEffect(() => {
    if (open) {
      setRange(departDate ? { from: departDate, to: returnDate } : undefined);
      setMonth(departDate ?? earliestDate);
    }
  }, [open, departDate, returnDate, earliestDate]);

  // Fetch real fare data from Duffel when origin & destination are set
  const { fares, isLoading: faresLoading, hasData: hasFareData } = useFareCalendar(
    origin,
    destination,
    month.getFullYear(),
    month.getMonth(),
    cabinClass
  );

  const handleDone = () => {
    if (range?.from && range?.to) {
      onRangeConfirmed(range.from, range.to);
      onOpenChange(false);
    } else if (range?.from) {
      const ret = addDays(range.from, 7);
      onRangeConfirmed(range.from, ret);
      onOpenChange(false);
    }
  };

  const summaryText = range?.from
    ? range.to
      ? `${format(range.from, "MMM d")} → ${format(range.to, "MMM d")}`
      : `Depart: ${format(range.from, "MMM d")} — tap return`
    : "Tap departure date";

  // Get price level for a date: real data first, fallback second
  const getLevel = (date: Date): PriceLevel => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (hasFareData && fares[dateStr]) {
      return fares[dateStr].level;
    }
    return getFallbackPriceLevel(date);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 bg-transparent border-0 shadow-none"
        style={{ paddingBottom: "var(--zivo-safe-bottom,16px)" }}
      >
        <div
          className="mx-3 mb-2 rounded-3xl overflow-hidden animate-scale-in"
          style={{
            background: "hsl(var(--card))",
            boxShadow: `
              0 -2px 0 0 hsl(var(--border) / 0.3),
              0 8px 32px -4px hsl(var(--foreground) / 0.12),
              0 24px 60px -8px hsl(var(--foreground) / 0.08),
              inset 0 1px 0 0 hsl(var(--card) / 0.8)
            `,
            transform: "perspective(800px) rotateX(1deg)",
            transformOrigin: "bottom center",
          }}
        >
          <SheetHeader className="px-5 pt-5 pb-3 text-left relative">
            <SheetTitle className="flex items-center gap-2.5 text-base font-semibold">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 45%))",
                  boxShadow: "0 2px 8px hsl(160 84% 39% / 0.3)",
                }}
              >
                <CalendarDays className="h-4 w-4 text-white" />
              </div>
              {label}
            </SheetTitle>
          </SheetHeader>

          <div className="mx-5 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Fare trend legend */}
          <div className="px-5 pt-3 pb-1 flex items-center gap-3">
            <span className="text-[10px] font-medium text-muted-foreground">
              {hasFareData ? "Live fares:" : "Fare trend:"}
            </span>
            {(["low", "mid", "high"] as PriceLevel[]).map((level) => (
              <span key={level} className="flex items-center gap-1.5">
                <span
                  className="w-5 h-5 rounded-md"
                  style={{ background: priceLevelConfig[level].legendBg }}
                />
                <span className="text-[10px] font-semibold" style={{ color: priceLevelConfig[level].color }}>
                  {priceLevelConfig[level].label}
                </span>
              </span>
            ))}
            {faresLoading && (
              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin ml-auto" />
            )}
          </div>

          <div className="px-4 py-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--background))",
                boxShadow: "inset 0 2px 6px hsl(var(--foreground) / 0.04), 0 1px 0 hsl(var(--card))",
              }}
            >
              <Calendar
                mode="range"
                month={month}
                onMonthChange={setMonth}
                selected={range}
                onSelect={setRange}
                numberOfMonths={1}
                disabled={(date) => isBefore(date, earliestDate)}
                initialFocus
                className="pointer-events-auto p-3"
                classNames={calendarClassNames3DPricing}
                components={{
                  DayContent: ({ date }: any) => {
                    const disabled = isBefore(date, earliestDate);
                    const level = disabled ? null : getLevel(date);
                    return (
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg mx-auto text-sm font-medium"
                        style={level ? { background: priceLevelConfig[level].bg } : undefined}
                      >
                        {date.getDate()}
                      </div>
                    );
                  },
                } as any}
              />
            </div>
          </div>

          <div className="px-5 pb-5 pt-1 flex items-center justify-between gap-3">
            <div className="min-h-10 flex flex-col justify-center">
              <span className="text-sm text-muted-foreground font-medium">{summaryText}</span>
              {range?.from && !range?.to && (
                <span className="text-[10px] text-muted-foreground/60 mt-0.5">Now tap your return date</span>
              )}
            </div>
            <Button
              type="button"
              onClick={handleDone}
              disabled={!range?.from}
              className="min-w-[100px] h-11 rounded-2xl text-white font-semibold text-sm border-0 active:scale-[0.97] transition-all duration-150 disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 45%))",
                boxShadow: "0 4px 14px hsl(160 84% 39% / 0.35), 0 1px 3px hsl(160 84% 39% / 0.2), inset 0 1px 0 hsl(160 84% 60% / 0.3)",
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── 3D-styled calendar classNames ─── */
const calendarClassNames3D = {
  months: "flex flex-col space-y-4",
  month: "space-y-3",
  caption: "flex justify-center pt-1 relative items-center",
  caption_label: "text-sm font-bold text-foreground tracking-tight",
  nav: "space-x-1 flex items-center",
  nav_button:
    "h-8 w-8 p-0 opacity-60 hover:opacity-100 inline-flex items-center justify-center rounded-xl hover:bg-muted/80 transition-all active:scale-95",
  nav_button_previous: "absolute left-1",
  nav_button_next: "absolute right-1",
  table: "w-full border-collapse",
  head_row: "flex",
  head_cell:
    "text-muted-foreground/70 rounded-md w-10 font-semibold text-[11px] uppercase tracking-wider py-2 text-center",
  row: "flex w-full mt-0.5",
  cell: `h-10 w-10 text-center text-sm p-0 relative
    [&:has([aria-selected].day-range-end)]:rounded-r-xl
    [&:has([aria-selected].day-outside)]:bg-emerald-500/8
    [&:has([aria-selected])]:bg-emerald-500/8
    first:[&:has([aria-selected])]:rounded-l-xl
    last:[&:has([aria-selected])]:rounded-r-xl
    focus-within:relative focus-within:z-20`,
  day: `h-10 w-10 p-0 font-medium rounded-xl
    hover:bg-emerald-500/10 transition-all duration-150
    inline-flex items-center justify-center text-foreground
    aria-selected:opacity-100 active:scale-[0.92]`,
  day_range_end: "day-range-end",
  day_selected: `bg-emerald-500 text-white hover:bg-emerald-600 focus:bg-emerald-500
    font-bold rounded-xl`,
  day_today:
    "text-emerald-600 font-bold rounded-xl ring-1 ring-emerald-500/30",
  day_outside:
    "text-muted-foreground/25 aria-selected:bg-emerald-500/40 aria-selected:text-white",
  day_disabled: "text-muted-foreground/20",
  day_range_middle:
    "aria-selected:bg-emerald-500/8 aria-selected:text-foreground rounded-none",
  day_hidden: "invisible",
};

const calendarClassNames3DPricing = {
  ...calendarClassNames3D,
  cell: `h-11 w-10 text-center text-sm p-0 relative
    [&:has([aria-selected].day-range-end)]:rounded-r-xl
    [&:has([aria-selected].day-outside)]:bg-emerald-500/8
    [&:has([aria-selected])]:bg-emerald-500/8
    first:[&:has([aria-selected])]:rounded-l-xl
    last:[&:has([aria-selected])]:rounded-r-xl
    focus-within:relative focus-within:z-20`,
  day: `h-11 w-10 p-0 font-medium rounded-xl
    hover:bg-emerald-500/10 transition-all duration-150
    inline-flex items-center justify-center text-foreground
    aria-selected:opacity-100 active:scale-[0.92]`,
};
