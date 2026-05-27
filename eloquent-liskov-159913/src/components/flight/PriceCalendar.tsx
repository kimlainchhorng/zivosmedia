/**
 * PriceCalendar — Compact inline price calendar
 * Used in search hero for quick date picking with price hints
 */
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBefore, startOfToday, format } from "date-fns";

interface PriceCalendarProps {
  basePrice?: number;
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
  fromCode?: string;
  toCode?: string;
  className?: string;
}

type PriceTrend = "low" | "medium" | "high";

function generatePrices(year: number, month: number, base: number) {
  const days = new Date(year, month + 1, 0).getDate();
  const today = startOfToday();
  const result: Record<number, { price: number; trend: PriceTrend }> = {};

  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    if (isBefore(date, today)) continue;
    const dow = date.getDay();
    const seed = (year * 365 + month * 31 + d) % 100;
    const mod = dow === 2 || dow === 3 ? -0.1 : dow === 0 || dow === 5 ? 0.12 : (seed % 16 - 8) / 100;
    const price = Math.round(base * (1 + mod + (seed % 20 - 10) / 100));
    result[d] = {
      price,
      trend: price < base * 0.93 ? "low" : price > base * 1.07 ? "high" : "medium",
    };
  }
  return result;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function PriceCalendar({
  basePrice = 249,
  selectedDate,
  onSelectDate,
  className,
}: PriceCalendarProps) {
  const [month, setMonth] = useState(() => {
    if (selectedDate) return new Date(selectedDate.getFullYear(), selectedDate.getMonth());
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1);
  });

  const prices = useMemo(
    () => generatePrices(month.getFullYear(), month.getMonth(), basePrice),
    [month, basePrice]
  );

  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const lowest = useMemo(() => {
    const vals = Object.values(prices).map((p) => p.price);
    return vals.length ? Math.min(...vals) : 0;
  }, [prices]);

  return (
    <div className={cn("rounded-xl border border-border/50 bg-card/80 backdrop-blur p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" aria-label="Previous month" className="h-7 w-7" onClick={() => {
          const prev = new Date(month.getFullYear(), month.getMonth() - 1);
          if (!isBefore(prev, startOfToday())) setMonth(prev);
        }}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold">
          {format(month, "MMMM yyyy")}
        </span>
        <Button variant="ghost" size="icon" aria-label="Next month" className="h-7 w-7" onClick={() => {
          const next = new Date(month.getFullYear(), month.getMonth() + 1);
          const max = new Date(); max.setMonth(max.getMonth() + 11);
          if (isBefore(next, max)) setMonth(next);
        }}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`e-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const data = prices[day];
          if (!data) {
            return <div key={day} className="aspect-square flex items-center justify-center text-[10px] text-muted-foreground/30">{day}</div>;
          }
          const isLowest = data.price === lowest;
          const isSelected = selectedDate && selectedDate.getDate() === day &&
            selectedDate.getMonth() === month.getMonth() && selectedDate.getFullYear() === month.getFullYear();

          return (
            <button type="button"
              key={day}
              onClick={() => onSelectDate?.(new Date(month.getFullYear(), month.getMonth(), day))}
              className={cn(
                "aspect-square rounded-md flex flex-col items-center justify-center gap-0 transition-all text-[10px] touch-manipulation",
                data.trend === "low" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                data.trend === "high" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                "bg-muted/30 text-foreground",
                isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                isLowest && !isSelected && "ring-1 ring-emerald-500/50",
                "hover:bg-primary/10 active:scale-90"
              )}
            >
              <span className="font-medium opacity-60 leading-none">{day}</span>
              <span className="font-bold leading-none">${data.price}</span>
              {isLowest && <Sparkles className="w-2 h-2 text-emerald-500" />}
            </button>
          );
        })}
      </div>

      {/* Legend + Disclaimer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
        <div className="flex gap-3">
          {[
            { c: "bg-emerald-500/20", l: "Low" },
            { c: "bg-muted/40", l: "Avg" },
            { c: "bg-rose-500/20", l: "High" },
          ].map((x) => (
            <div key={x.l} className="flex items-center gap-1">
              <div className={cn("w-2.5 h-2.5 rounded-sm", x.c)} />
              <span className="text-[9px] text-muted-foreground">{x.l}</span>
            </div>
          ))}
        </div>
        <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 border-border/50">
          <Info className="w-2 h-2 mr-0.5" /> Estimated
        </Badge>
      </div>
    </div>
  );
}
