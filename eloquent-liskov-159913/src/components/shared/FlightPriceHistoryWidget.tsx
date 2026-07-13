import { useState } from "react";
import { TrendingDown, TrendingUp, Calendar, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricePoint {
  month: string;
  price: number;
  trend: "low" | "medium" | "high";
}

interface FlightPriceHistoryWidgetProps {
  className?: string;
  route?: string;
  priceData?: PricePoint[];
}

const generatePriceHistory = (basePrice: number = 245): PricePoint[] => {
  const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
  const variations = [1.0, 0.8, 1.12, 1.27, 1.58, 0.68];
  
  return months.map((month, index) => {
    const price = Math.round(basePrice * variations[index]);
    const trend: "low" | "medium" | "high" = 
      variations[index] < 0.85 ? "low" : 
      variations[index] > 1.2 ? "high" : "medium";
    return { month, price, trend };
  });
};

const trendColors = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

const FlightPriceHistoryWidget = ({ 
  className, 
  route = "JFK → LAX",
  priceData
}: FlightPriceHistoryWidgetProps) => {
  const [selectedMonth, setSelectedMonth] = useState<PricePoint | null>(null);
  
  const priceHistory = priceData || generatePriceHistory();
  const maxPrice = Math.max(...priceHistory.map(p => p.price));
  const minPrice = Math.min(...priceHistory.map(p => p.price));
  const avgPrice = Math.round(priceHistory.reduce((a, b) => a + b.price, 0) / priceHistory.length);
  const lowestMonth = priceHistory.find(p => p.price === minPrice);

  return (
    <div className={cn("p-4 rounded-xl bg-card/60 backdrop-blur-xl border border-border/50", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">6-Month Price History</h3>
        </div>
        <Badge variant="secondary" className="text-xs">{route}</Badge>
      </div>

      {/* Price Chart */}
      <div className="flex items-end gap-2 h-32 mb-4">
        {priceHistory.map((point, i) => {
          const height = ((point.price - minPrice + 20) / (maxPrice - minPrice + 40)) * 100;
          return (
            <button type="button"
              key={i}
              onClick={() => setSelectedMonth(point)}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              <div className="relative w-full flex justify-center">
                <div
                  className={cn(
                    "w-full max-w-8 rounded-t-md transition-all group-hover:opacity-80",
                    trendColors[point.trend],
                    selectedMonth?.month === point.month && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  style={{ height: `${height}%`, minHeight: "20px" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{point.month}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">High</span>
        </div>
      </div>

      {/* Selected/Summary Info */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
        {selectedMonth ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{selectedMonth.month} Average</p>
              <p className="text-lg font-bold">${selectedMonth.price}</p>
            </div>
            <Badge className={cn(
              selectedMonth.trend === "low" && "bg-emerald-500/10 text-emerald-400",
              selectedMonth.trend === "medium" && "bg-amber-500/10 text-amber-400",
              selectedMonth.trend === "high" && "bg-red-500/10 text-red-400"
            )}>
              {selectedMonth.trend === "low" ? (
                <><TrendingDown className="w-3 h-3 mr-1" /> Best time</>
              ) : selectedMonth.trend === "high" ? (
                <><TrendingUp className="w-3 h-3 mr-1" /> Peak season</>
              ) : (
                "Moderate"
              )}
            </Badge>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Best time to book</p>
              <p className="font-semibold">{lowestMonth?.month} - ${lowestMonth?.price} avg</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">6-month avg</p>
              <p className="font-semibold">${avgPrice}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 mt-3 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p>Prices are typically 15-20% lower when booked 6-8 weeks in advance.</p>
      </div>
    </div>
  );
};

export default FlightPriceHistoryWidget;
