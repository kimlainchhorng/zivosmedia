/**
 * FlightPriceCalendar
 * Visual calendar showing simulated price trends per day
 * Prices are illustrative — actual prices come from live search
 */
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, TrendingDown, Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { isBefore, startOfToday } from "date-fns";

interface FlightPriceCalendarProps {
  className?: string;
  onSelectDate?: (date: string) => void;
  basePrice?: number;
}

type PriceTrend = "low" | "medium" | "high";

interface DayPrice {
  price: number;
  trend: PriceTrend;
}

/**
 * Generate simulated price data for a month
 * Uses deterministic seed based on year+month so it's consistent
 */
function generateMonthPrices(year: number, month: number, basePrice: number): Record<number, DayPrice> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prices: Record<number, DayPrice> = {};
  const today = startOfToday();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (isBefore(date, today)) continue;

    // Seed-based pseudo-random using day of week + day number
    const dow = date.getDay();
    const seed = (year * 365 + month * 31 + day) % 100;

    // Tue/Wed/Sat tend cheaper, Fri/Sun pricier
    let modifier = 0;
    if (dow === 2 || dow === 3) modifier = -0.12;
    else if (dow === 6) modifier = -0.08;
    else if (dow === 0 || dow === 5) modifier = 0.15;
    else modifier = (seed % 20 - 10) / 100;

    const price = Math.round(basePrice * (1 + modifier + (seed % 30 - 15) / 100));
    const trend: PriceTrend = price < basePrice * 0.92 ? "low" : price > basePrice * 1.08 ? "high" : "medium";

    prices[day] = { price, trend };
  }

  return prices;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const TREND_STYLES: Record<PriceTrend, string> = {
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/25",
  high: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/25",
};

export default function FlightPriceCalendar({ className, onSelectDate, basePrice = 249 }: FlightPriceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1); // Start next month
  });

  const priceData = useMemo(
    () => generateMonthPrices(currentMonth.getFullYear(), currentMonth.getMonth(), basePrice),
    [currentMonth, basePrice]
  );

  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const lowestPrice = useMemo(() => {
    const prices = Object.values(priceData).map((p) => p.price);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }, [priceData]);

  const prevMonth = () => {
    const prev = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    if (!isBefore(prev, startOfToday())) {
      setCurrentMonth(prev);
    }
  };

  const nextMonth = () => {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 11);
    if (isBefore(next, maxDate)) {
      setCurrentMonth(next);
    }
  };

  return (
    <section className={cn("py-10 sm:py-16", className)}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12">
          <Badge className="mb-4 px-4 py-2 bg-primary/10 text-primary border-primary/20">
            <Calendar className="w-4 h-4 mr-2" />
            Price Calendar
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Find the Cheapest Days to Fly
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore estimated prices across the month to find the best deals
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" aria-label="Previous month" onClick={prevMonth} className="touch-manipulation">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h3 className="text-lg sm:text-xl font-semibold">
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <Button variant="ghost" size="icon" aria-label="Next month" onClick={nextMonth} className="touch-manipulation">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAY_NAMES.map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayData = priceData[day];

                  if (!dayData) {
                    return (
                      <div key={day} className="aspect-square p-1 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-muted-foreground/40">{day}</span>
                      </div>
                    );
                  }

                  const isLowest = dayData.price === lowestPrice;

                  return (
                    <button type="button"
                      key={day}
                      onClick={() =>
                        onSelectDate?.(
                          `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                        )
                      }
                      className={cn(
                        "aspect-square p-0.5 sm:p-1 rounded-lg border transition-all duration-150 touch-manipulation",
                        "hover:scale-105 active:scale-95",
                        TREND_STYLES[dayData.trend],
                        isLowest && "ring-2 ring-emerald-500 ring-offset-1 ring-offset-background"
                      )}
                    >
                      <div className="h-full flex flex-col items-center justify-center gap-0.5">
                        <span className="text-[10px] sm:text-xs font-medium opacity-70">{day}</span>
                        <span className="text-[10px] sm:text-xs font-bold">${dayData.price}</span>
                        {isLowest && <Sparkles className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-border/30">
                {[
                  { color: "bg-emerald-500/20 border-emerald-500/30", label: "Low" },
                  { color: "bg-amber-500/20 border-amber-500/30", label: "Medium" },
                  { color: "bg-rose-500/20 border-rose-500/30", label: "High" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded border", l.color)} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Best Price</span>
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" />
                Estimated prices for illustration. Actual fares confirmed at search.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
